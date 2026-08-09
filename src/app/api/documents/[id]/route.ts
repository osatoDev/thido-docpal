import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentAccessWhere, getDocumentForUser } from "@/lib/documentAuth";
import { shouldPromotePlaceholder } from "@/lib/documentPersistence";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { isCommentMarkOnlyChange } from "@/lib/publicDocument";
import {
  DOCUMENT_AI_LOCK_MESSAGE,
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  lockDocumentForCommentAi,
} from "@/lib/documentAiJobs";
import { reportServerError } from "@/lib/rollbar/server";
import { recordDocumentRevision } from "@/lib/documentRevisions";
import { DocumentRevisionSource } from "@prisma/client";
import { reconcileOrphanedComments } from "@/lib/documentComments";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const document = await prisma.document.findFirst({
    where: {
      id,
      AND: documentAccessWhere(session.user.id, session.user.email, "VIEW"),
    },
    include: {
      promptAnswers: { orderBy: { order: "asc" } },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { name: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { name: true } } },
          },
          suggestion: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ document });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const editableDocument = await getDocumentForUser(
    id,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  const commentableDocument =
    editableDocument ??
    (await getDocumentForUser(
      id,
      session.user.id,
      session.user.email,
      "COMMENT",
    ));
  if (!commentableDocument) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const baseRevision =
    Number.isInteger(body.baseRevision) && body.baseRevision >= 0
      ? (body.baseRevision as number)
      : null;
  if (baseRevision === null) {
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
    editableDocument && typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : null;
  const titleUpdateSource =
    body.titleUpdateSource === "AUTO" ? "AUTO" : "USER";
  if (requestedTitle && titleUpdateSource === "USER") {
    data.title = requestedTitle;
    data.titleManuallySet = true;
  }
  if (body.content !== undefined) {
    if (!editableDocument) {
      const currentContent =
        commentableDocument.content &&
        typeof commentableDocument.content === "object"
          ? (commentableDocument.content as JSONContent)
          : null;
      const proposedContent =
        body.content && typeof body.content === "object"
          ? (body.content as JSONContent)
          : null;
      if (
        !currentContent ||
        !proposedContent ||
        !isCommentMarkOnlyChange(currentContent, proposedContent)
      ) {
        return NextResponse.json(
          { error: "Comment access cannot change document text." },
          { status: 403 },
        );
      }
    }
    data.content = body.content;
  }
  if (
    editableDocument?.isPlaceholder &&
    shouldPromotePlaceholder({
      title: data.title,
      content: data.content,
    })
  ) {
    data.isPlaceholder = false;
  }

  const updateResult = await prisma.$transaction(async (transaction) => {
    const documentExists = await lockDocumentForCommentAi(transaction, id);
    if (!documentExists) return { kind: "missing" as const };

    const currentDocument = await transaction.document.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        titleManuallySet: true,
        content: true,
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

    await expireStaleCommentAiJobs(transaction, id);
    if (
      await hasActiveCommentAiJob(transaction, id, {
        documentWideOnly: true,
      })
    ) {
      return { kind: "locked" as const };
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (updateResult.kind === "locked") {
    return NextResponse.json(
      { error: DOCUMENT_AI_LOCK_MESSAGE, documentAiLocked: true },
      { status: 409 },
    );
  }
  if (updateResult.kind === "conflict") {
    return NextResponse.json(
      {
        error:
          "This document changed in another tab or by another collaborator.",
        documentConflict: true,
        currentRevision: updateResult.currentRevision,
      },
      { status: 409 },
    );
  }
  const document = updateResult.document;

  if (body.content !== undefined) {
    await reconcileOrphanedComments(prisma, id, body.content as JSONContent);
  }

  return NextResponse.json({ document });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await getDocumentForUser(
    id,
    session.user.id,
    session.user.email,
    "FULL",
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const imageBlobs = await prisma.documentImage.findMany({
    where: { documentId: id },
    select: { blobUrl: true },
  });

  const deleteResult = await prisma.$transaction(async (transaction) => {
    const documentExists = await lockDocumentForCommentAi(transaction, id);
    if (!documentExists) return "missing" as const;

    await expireStaleCommentAiJobs(transaction, id);
    if (
      await hasActiveCommentAiJob(transaction, id, {
        documentWideOnly: true,
      })
    ) {
      return "locked" as const;
    }

    await transaction.document.delete({ where: { id } });
    return "deleted" as const;
  });
  if (deleteResult === "missing") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (deleteResult === "locked") {
    return NextResponse.json(
      { error: DOCUMENT_AI_LOCK_MESSAGE },
      { status: 409 },
    );
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
