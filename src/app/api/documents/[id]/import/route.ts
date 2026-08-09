import { del, put } from "@vercel/blob";
import { DocumentRevisionSource } from "@prisma/client";
import { generateJSON } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/react";
import mammoth from "mammoth";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { reconcileOrphanedComments } from "@/lib/documentComments";
import { getDocumentForUser } from "@/lib/documentAuth";
import {
  DOCUMENT_AI_LOCK_MESSAGE,
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  lockDocumentForCommentAi,
} from "@/lib/documentAiJobs";
import { recordDocumentRevision } from "@/lib/documentRevisions";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { sanitizeImportedWordHtml } from "@/lib/documentImport";
import {
  documentImportRequestId,
  type DocumentImportFileKind,
  type DocumentImportLogLevel,
  writeDocumentImportLog,
} from "@/lib/documentImportObservability";
import { inferDocumentTitle } from "@/lib/documentPersistence";
import { markdownToTiptapJSON } from "@/lib/markdownToTiptap";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { reportServerError } from "@/lib/rollbar/server";

export const runtime = "nodejs";

const MAX_WORD_FILE_BYTES = 15 * 1024 * 1024;
const MAX_MARKDOWN_FILE_BYTES = 2 * 1024 * 1024;
const MAX_IMPORTED_IMAGE_BYTES = 8 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> };
type ImportStage = "comment_reconciliation" | "conversion" | "persistence";

function titleFromFilename(filename: string) {
  return (
    filename
      .replace(/\.docx$/i, "")
      .replace(/\.md$/i, "")
      .replace(/[\u0000-\u001f]/g, "")
      .trim()
      .slice(0, 200) || "Imported document"
  );
}

export async function POST(request: Request, { params }: Params) {
  const startedAt = Date.now();
  const requestId = documentImportRequestId(request.headers);
  const { id: documentId } = await params;
  let fileKind: DocumentImportFileKind = "unknown";
  let importStage: ImportStage = "conversion";
  const logOutcome = ({
    error,
    level,
    reason,
    status,
  }: {
    error?: unknown;
    level: DocumentImportLogLevel;
    reason: string;
    status: number;
  }) =>
    writeDocumentImportLog({
      documentId,
      durationMs: Date.now() - startedAt,
      error,
      event: "document_import_finished",
      fileKind,
      level,
      reason,
      requestId,
      status,
    });
  const errorResponse = (
    error: string,
    status: number,
    reason: string,
    details: Record<string, unknown> = {},
  ) => {
    logOutcome({ level: "warning", reason, status });
    return NextResponse.json(
      { ...details, error, requestId },
      { status, headers: { "x-thido-request-id": requestId } },
    );
  };

  writeDocumentImportLog({
    event: "document_import_started",
    fileKind,
    level: "info",
    requestId,
  });

  const session = await auth();
  if (!session?.user?.id) {
    logOutcome({ level: "warning", reason: "unauthorized", status: 401 });
    const response = unauthorizedResponse();
    response.headers.set("x-thido-request-id", requestId);
    return response;
  }
  if (!checkRateLimit(`document-import:${session.user.id}`, 10, 60 * 60_000)) {
    return errorResponse(
      "Too many imports. Try again later.",
      429,
      "rate_limited",
    );
  }

  const document = await getDocumentForUser(
    documentId,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  if (!document) {
    return errorResponse("Not found", 404, "not_found_or_forbidden");
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const baseRevisionValue = formData?.get("baseRevision");
  const baseRevision =
    typeof baseRevisionValue === "string" && /^\d+$/.test(baseRevisionValue)
      ? Number(baseRevisionValue)
      : null;
  const extension = file instanceof File ? file.name.toLowerCase() : "";
  const isWordFile = extension.endsWith(".docx");
  const isMarkdownFile = extension.endsWith(".md");
  fileKind = isWordFile ? "docx" : isMarkdownFile ? "markdown" : "unknown";
  if (!(file instanceof File) || (!isWordFile && !isMarkdownFile)) {
    return errorResponse(
      "Choose a Word .docx or Markdown .md file.",
      400,
      "invalid_file",
    );
  }
  if (baseRevision === null) {
    return errorResponse(
      "A valid baseRevision is required.",
      400,
      "invalid_revision",
    );
  }
  const maximumSize = isMarkdownFile
    ? MAX_MARKDOWN_FILE_BYTES
    : MAX_WORD_FILE_BYTES;
  if (file.size <= 0 || file.size > maximumSize) {
    return errorResponse(
      isMarkdownFile
        ? "Markdown files must be smaller than 2 MB."
        : "Word files must be smaller than 15 MB.",
      413,
      "file_too_large_or_empty",
    );
  }

  const storedImages: Array<{ id: string; blobUrl: string }> = [];
  async function cleanupImportedImages() {
    await Promise.allSettled(storedImages.map((image) => del(image.blobUrl)));
    if (storedImages.length > 0) {
      await prisma.documentImage.deleteMany({
        where: { id: { in: storedImages.map((image) => image.id) } },
      });
    }
  }

  try {
    let content: JSONContent;
    let warnings: string[] = [];
    if (isMarkdownFile) {
      const markdown = (await file.text()).replace(/^\uFEFF/, "");
      content = await markdownToTiptapJSON(markdown, { sanitize: true });
    } else {
      const input = Buffer.from(await file.arrayBuffer());
      const conversion = await mammoth.convertToHtml(
        { buffer: input },
        {
          externalFileAccess: false,
          ignoreEmptyParagraphs: false,
          convertImage: mammoth.images.imgElement(async (image) => {
            const source = await image.readAsBuffer();
            if (source.byteLength > MAX_IMPORTED_IMAGE_BYTES) {
              throw new Error("An image in this Word file is larger than 8 MB.");
            }
            const data = await sharp(source).rotate().png().toBuffer();
            const imageId = crypto.randomUUID();
            const pathname = `documents/${documentId}/${imageId}.png`;
            const blob = await put(pathname, data, {
              access: "private",
              addRandomSuffix: false,
              contentType: "image/png",
              cacheControlMaxAge: 60 * 60 * 24 * 30,
            });
            await prisma.documentImage.create({
              data: {
                id: imageId,
                documentId,
                uploadedById: session.user.id,
                blobUrl: blob.url,
                pathname: blob.pathname,
                contentType: "image/png",
                size: data.byteLength,
                alt: "Imported image",
              },
            });
            storedImages.push({ id: imageId, blobUrl: blob.url });
            return {
              src: `/api/document-images/${encodeURIComponent(imageId)}`,
            };
          }),
        },
      );

      const safeHtml = sanitizeImportedWordHtml(conversion.value);
      content = generateJSON(safeHtml, getEditorExtensions()) as JSONContent;
      warnings = conversion.messages
        .map((message) => message.message)
        .filter((message, index, messages) => messages.indexOf(message) === index)
        .slice(0, 8);
    }
    const title = inferDocumentTitle(content) ?? titleFromFilename(file.name);
    importStage = "persistence";
    const result = await prisma.$transaction(async (transaction) => {
      if (!(await lockDocumentForCommentAi(transaction, documentId))) {
        return { kind: "missing" as const };
      }
      const current = await transaction.document.findUnique({
        where: { id: documentId },
        select: { revision: true },
      });
      if (!current) return { kind: "missing" as const };
      if (current.revision !== baseRevision) {
        return {
          kind: "conflict" as const,
          currentRevision: current.revision,
        };
      }
      await expireStaleCommentAiJobs(transaction, documentId);
      if (
        await hasActiveCommentAiJob(transaction, documentId, {
          documentWideOnly: true,
        })
      ) {
        return { kind: "locked" as const };
      }

      const updatedDocument = await transaction.document.update({
        where: { id: documentId },
        data: {
          title,
          titleManuallySet: true,
          content,
          revision: { increment: 1 },
          isPlaceholder: false,
        },
      });
      await recordDocumentRevision(transaction, updatedDocument, {
        source: DocumentRevisionSource.IMPORT,
        actorId: session.user.id,
      });
      return { kind: "imported" as const, document: updatedDocument };
    });

    if (result.kind !== "imported") {
      await cleanupImportedImages();
    }
    if (result.kind === "missing") {
      return errorResponse("Not found", 404, "document_missing");
    }
    if (result.kind === "locked") {
      return errorResponse(
        DOCUMENT_AI_LOCK_MESSAGE,
        409,
        "document_locked",
      );
    }
    if (result.kind === "conflict") {
      return errorResponse(
        "The document changed while the file was importing.",
        409,
        "revision_conflict",
        {
          documentConflict: true,
          currentRevision: result.currentRevision,
        },
      );
    }

    importStage = "comment_reconciliation";
    await reconcileOrphanedComments(prisma, documentId, content);
    logOutcome({ level: "info", reason: "imported", status: 200 });
    return NextResponse.json(
      {
        document: {
          title: result.document.title,
          content: result.document.content,
          revision: result.document.revision,
          titleManuallySet: result.document.titleManuallySet,
        },
        requestId,
        warnings: warnings.slice(0, 8),
      },
      { headers: { "x-thido-request-id": requestId } },
    );
  } catch (error) {
    const errorCode = `${importStage}_failed`;
    logOutcome({
      error,
      level: "error",
      reason: errorCode,
      status: 422,
    });
    try {
      await cleanupImportedImages();
    } catch (cleanupError) {
      writeDocumentImportLog({
        documentId,
        durationMs: Date.now() - startedAt,
        error: cleanupError,
        event: "document_import_finished",
        fileKind,
        level: "error",
        reason: "cleanup_failed",
        requestId,
        status: 500,
      });
      await reportServerError(cleanupError, {
        source: "document-import-cleanup",
        operation: fileKind,
        documentId,
        errorCode: "cleanup_failed",
        requestId,
        status: 500,
      });
    }
    await reportServerError(error, {
      source: "document-import",
      operation: fileKind,
      documentId,
      errorCode,
      requestId,
      status: 422,
    });
    return NextResponse.json(
      { error: "Could not import this document.", requestId },
      { status: 422, headers: { "x-thido-request-id": requestId } },
    );
  }
}
