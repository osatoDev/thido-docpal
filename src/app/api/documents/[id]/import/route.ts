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
import {
  importedPlainTextToDocument,
  importedPlainTextStringToDocument,
  sanitizeImportedWordHtml,
} from "@/lib/documentImport";
import {
  documentImportFormatForFileName,
  documentImportTitleFromFileName,
  SUPPORTED_DOCUMENT_FILE_LABEL,
} from "@/lib/documentFileTypes";
import {
  documentImportRequestId,
  type DocumentImportFileKind,
  type DocumentImportLogLevel,
  writeDocumentImportLog,
} from "@/lib/documentImportObservability";
import { inferDocumentTitle } from "@/lib/documentPersistence";
import {
  convertStructuredOfficeDocument,
  extractLegacyWordText,
  validateOfficeDocumentSignature,
} from "@/lib/legacyDocumentImport";
import { markdownToTiptapJSON } from "@/lib/markdownToTiptap";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { reportServerError } from "@/lib/rollbar/server";

export const runtime = "nodejs";

const MAX_IMPORTED_IMAGE_BYTES = 8 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> };
type ImportStage = "comment_reconciliation" | "conversion" | "persistence";

function titleFromFilename(filename: string) {
  return (
    documentImportTitleFromFileName(filename)
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
  const errorResponse = async (
    error: string,
    status: number,
    reason: string,
    details: Record<string, unknown> = {},
  ) => {
    logOutcome({ level: "warning", reason, status });
    await reportServerError(new Error(error), {
      source: "document-import",
      operation: reason,
      documentId,
      requestId,
      status,
    });
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
    const response = await unauthorizedResponse();
    response.headers.set("x-thido-request-id", requestId);
    return response;
  }
  if (!checkRateLimit(`document-import:${session.user.id}`, 10, 60 * 60_000)) {
    return await errorResponse(
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
    return await errorResponse("Not found", 404, "not_found_or_forbidden");
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const baseRevisionValue = formData?.get("baseRevision");
  const baseRevision =
    typeof baseRevisionValue === "string" && /^\d+$/.test(baseRevisionValue)
      ? Number(baseRevisionValue)
      : null;
  const format =
    file instanceof File
      ? documentImportFormatForFileName(file.name)
      : undefined;
  fileKind = format?.kind ?? "unknown";
  if (!(file instanceof File) || !format) {
    return await errorResponse(
      `Choose a supported document: ${SUPPORTED_DOCUMENT_FILE_LABEL}.`,
      400,
      "invalid_file",
    );
  }
  if (baseRevision === null) {
    return await errorResponse(
      "A valid baseRevision is required.",
      400,
      "invalid_revision",
    );
  }
  if (file.size <= 0 || file.size > format.maximumBytes) {
    return await errorResponse(
      format.sizeError,
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
    if (format.kind === "markdown") {
      const markdown = (await file.text()).replace(/^\uFEFF/, "");
      content = await markdownToTiptapJSON(markdown, { sanitize: true });
    } else if (format.kind === "text") {
      content = importedPlainTextToDocument(
        new Uint8Array(await file.arrayBuffer()),
      );
    } else if (format.kind === "doc") {
      const input = new Uint8Array(await file.arrayBuffer());
      content = importedPlainTextStringToDocument(
        await extractLegacyWordText(input),
      );
      warnings = [
        "Legacy Word import preserves editable text but may simplify formatting and omit images.",
      ];
    } else if (format.kind === "odt" || format.kind === "rtf") {
      const conversion = await convertStructuredOfficeDocument(
        new Uint8Array(await file.arrayBuffer()),
        format.kind,
      );
      const safeHtml = sanitizeImportedWordHtml(conversion.html);
      content = generateJSON(safeHtml, getEditorExtensions()) as JSONContent;
      warnings = conversion.warnings;
    } else {
      const input = Buffer.from(await file.arrayBuffer());
      validateOfficeDocumentSignature(input, "docx");
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
      if (await hasActiveCommentAiJob(transaction, documentId)) {
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
      return await errorResponse("Not found", 404, "document_missing");
    }
    if (result.kind === "locked") {
      return await errorResponse(
        DOCUMENT_AI_LOCK_MESSAGE,
        409,
        "document_locked",
      );
    }
    if (result.kind === "conflict") {
      return await errorResponse(
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
