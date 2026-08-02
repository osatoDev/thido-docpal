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
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { reportServerError } from "@/lib/rollbar/server";

export const runtime = "nodejs";

const MAX_WORD_FILE_BYTES = 15 * 1024 * 1024;
const MAX_IMPORTED_IMAGE_BYTES = 8 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> };

function titleFromFilename(filename: string) {
  return (
    filename
      .replace(/\.docx$/i, "")
      .replace(/[\u0000-\u001f]/g, "")
      .trim()
      .slice(0, 200) || "Imported document"
  );
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  if (!checkRateLimit(`document-import:${session.user.id}`, 10, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Too many imports. Try again later." },
      { status: 429 },
    );
  }

  const { id: documentId } = await params;
  const document = await getDocumentForUser(
    documentId,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const baseRevisionValue = formData?.get("baseRevision");
  const baseRevision =
    typeof baseRevisionValue === "string" && /^\d+$/.test(baseRevisionValue)
      ? Number(baseRevisionValue)
      : null;
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json(
      { error: "Choose a Word .docx file." },
      { status: 400 },
    );
  }
  if (baseRevision === null) {
    return NextResponse.json(
      { error: "A valid baseRevision is required." },
      { status: 400 },
    );
  }
  if (file.size <= 0 || file.size > MAX_WORD_FILE_BYTES) {
    return NextResponse.json(
      { error: "Word files must be smaller than 15 MB." },
      { status: 413 },
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
    const content = generateJSON(safeHtml, getEditorExtensions()) as JSONContent;
    const title = titleFromFilename(file.name);
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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (result.kind === "locked") {
      return NextResponse.json(
        { error: DOCUMENT_AI_LOCK_MESSAGE },
        { status: 409 },
      );
    }
    if (result.kind === "conflict") {
      return NextResponse.json(
        {
          error: "The document changed while the Word file was importing.",
          documentConflict: true,
          currentRevision: result.currentRevision,
        },
        { status: 409 },
      );
    }

    await reconcileOrphanedComments(prisma, documentId, content);
    const warnings = conversion.messages
      .map((message) => message.message)
      .filter((message, index, messages) => messages.indexOf(message) === index)
      .slice(0, 8);
    if (/<table[\s>]/i.test(conversion.value)) {
      warnings.unshift(
        "Tables were converted to supported text because Thido does not yet support editable tables.",
      );
    }
    if (/<a[\s>]/i.test(conversion.value)) {
      warnings.unshift(
        "Links were imported as text because Thido does not yet support editable links.",
      );
    }

    return NextResponse.json({
      document: {
        title: result.document.title,
        content: result.document.content,
        revision: result.document.revision,
      },
      warnings: warnings.slice(0, 8),
    });
  } catch (error) {
    await cleanupImportedImages();
    console.error("Unable to import Word document", error);
    await reportServerError(error, {
      source: "document-import",
      operation: "docx",
      documentId,
    });
    return NextResponse.json(
      { error: "Could not import this Word file." },
      { status: 422 },
    );
  }
}
