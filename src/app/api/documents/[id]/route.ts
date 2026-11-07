import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  documentAccessWhere,
  getDocumentForUser,
  lockDocumentRow,
} from "@/lib/documentAuth";
import { shouldPromotePlaceholder } from "@/lib/documentPersistence";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { reportServerError } from "@/lib/rollbar/server";
import { sendAdminNewDocumentNotification } from "@/lib/email";
import { recordDocumentRevision } from "@/lib/documentRevisions";
import { DocumentRevisionSource } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const { id } = await params;
  const document = await prisma.document.findFirst({
    where: {
      id,
      AND: documentAccessWhere(session.user.id),
    },
  });

  if (!document) {
    await reportServerError(new Error("Document not found"), {
      source: "document",
      operation: "get-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ document });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const { id } = await params;
  const editableDocument = await prisma.document.findFirst({
    where: {
      id,
      AND: documentAccessWhere(session.user.id),
    },
    select: { id: true, isPlaceholder: true },
  });
  if (!editableDocument) {
    await reportServerError(new Error("Document not found"), {
      source: "document",
      operation: "patch-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const baseRevision =
    Number.isInteger(body.baseRevision) && body.baseRevision >= 0
      ? (body.baseRevision as number)
      : null;
  if (baseRevision === null) {
    await reportServerError(new Error("Invalid baseRevision"), {
      source: "document",
      operation: "invalid-base-revision",
      status: 400,
      documentId: id,
    });
    return NextResponse.json(
      { error: "A valid baseRevision is required." },
      { status: 400 },
    );
  }
  const data: {
    title?: string;
    titleManuallySet?: boolean;
    content?: object;
    isPlaceholder?: false;
  } = {};
  const requestedTitle =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : null;
  const titleUpdateSource =
    body.titleUpdateSource === "AUTO" ? "AUTO" : "USER";
  if (requestedTitle && titleUpdateSource === "USER") {
    data.title = requestedTitle;
    data.titleManuallySet = true;
  }
  if (body.content !== undefined) {
    data.content = body.content;
  }
  if (
    editableDocument.isPlaceholder &&
    shouldPromotePlaceholder({
      title: data.title,
      content: data.content,
    })
  ) {
    data.isPlaceholder = false;
  }

  const updateResult = await prisma.$transaction(async (transaction) => {
    const documentExists = await lockDocumentRow(transaction, id);
    if (!documentExists) return { kind: "missing" as const };

    const currentDocument = await transaction.document.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        titleManuallySet: true,
        revision: true,
      },
    });
    if (!currentDocument) return { kind: "missing" as const };
    if (currentDocument.revision !== baseRevision) {
      return {
        kind: "conflict" as const,
        currentRevision: currentDocument.revision,
      };
    }

    if (
      requestedTitle &&
      titleUpdateSource === "AUTO" &&
      !currentDocument.titleManuallySet
    ) {
      data.title = requestedTitle;
    }

    const document = await transaction.document.update({
      where: { id },
      data: { ...data, revision: { increment: 1 } },
    });
    await recordDocumentRevision(transaction, document, {
      source: DocumentRevisionSource.USER,
      actorId: session.user.id,
    });
    return { kind: "updated" as const, document };
  });
  if (updateResult.kind === "missing") {
    await reportServerError(new Error("Document missing during update"), {
      source: "document",
      operation: "patch-document-missing",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (updateResult.kind === "conflict") {
    await reportServerError(new Error("Document revision conflict"), {
      source: "document",
      operation: "patch-conflict",
      status: 409,
      documentId: id,
    });
    return NextResponse.json(
      {
        error:
          "This document changed in another tab.",
        documentConflict: true,
        currentRevision: updateResult.currentRevision,
      },
      { status: 409 },
    );
  }
  const document = updateResult.document;

  if (editableDocument.isPlaceholder && data.isPlaceholder === false) {
    if (session.user.email) {
      try {
        await sendAdminNewDocumentNotification({
          documentId: document.id,
          title: document.title,
          ownerName: session.user.name ?? null,
          ownerEmail: session.user.email,
        });
      } catch (error) {
        console.error("Unable to send new document notification", error);
        await reportServerError(error, {
          source: "document",
          operation: "notify-new-document",
          documentId: id,
        });
      }
    }
  }

  return NextResponse.json({
    document: { id: document.id, revision: document.revision, title: document.title },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await getDocumentForUser(id, session.user.id);
  if (!existing) {
    await reportServerError(new Error("Document not found"), {
      source: "document",
      operation: "delete-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const imageBlobs = await prisma.documentImage.findMany({
    where: { documentId: id },
    select: { blobUrl: true },
  });

  const deleteResult = await prisma.$transaction(async (transaction) => {
    const documentExists = await lockDocumentRow(transaction, id);
    if (!documentExists) return "missing" as const;

    await transaction.document.delete({ where: { id } });
    return "deleted" as const;
  });
  if (deleteResult === "missing") {
    await reportServerError(new Error("Document missing during delete"), {
      source: "document",
      operation: "delete-document-missing",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (imageBlobs.length > 0) {
    try {
      await del(imageBlobs.map((image) => image.blobUrl));
    } catch (error) {
      console.error("Unable to delete document image blobs", error);
      await reportServerError(error, {
        source: "document-image",
        operation: "delete-with-document",
        documentId: id,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
