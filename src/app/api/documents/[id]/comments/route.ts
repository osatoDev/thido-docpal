import { NextResponse } from "next/server";

import { unauthorizedResponse } from "@/lib/apiResponses";
import { auth } from "@/lib/auth";
import {
  documentAccessWhere,
  getDocumentForUser,
} from "@/lib/documentAuth";
import {
  DOCUMENT_AI_LOCK_MESSAGE,
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  isCommentAiJobActive,
  lockDocumentForCommentAi,
} from "@/lib/documentAiJobs";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();

  const { id: documentId } = await params;
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      AND: documentAccessWhere(session.user.id, session.user.email, "VIEW"),
    },
    select: {
      content: true,
      revision: true,
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "desc" },
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
    await reportServerError(new Error("Document not found"), {
      source: "document-comment",
      operation: "get-not-found",
      status: 404,
      documentId,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  await expireStaleCommentAiJobs(prisma, documentId, now);
  const comments = document.comments.map((comment) =>
    comment.aiStatus === "PENDING" && !isCommentAiJobActive(comment, now)
      ? { ...comment, aiStatus: "FAILED" as const, aiCompletedAt: now }
      : comment,
  );
  return NextResponse.json({
    comments,
    documentContent: document.content,
    documentRevision: document.revision,
    documentAiLocked: comments.some((comment) =>
      isCommentAiJobActive(comment, now),
    ),
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();

  const { id: documentId } = await params;
  const document = await getDocumentForUser(
    documentId,
    session.user.id,
    session.user.email,
    "COMMENT",
  );
  if (!document) {
    await reportServerError(new Error("Document not found"), {
      source: "document-comment",
      operation: "post-not-found",
      status: 404,
      documentId,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const scope = body.scope === "DOCUMENT" ? "DOCUMENT" : "SELECTION";
  const anchorMarkId =
    scope === "SELECTION" && typeof body.anchorMarkId === "string"
      ? body.anchorMarkId
      : null;
  const quotedText =
    scope === "SELECTION" && typeof body.quotedText === "string"
      ? body.quotedText
      : null;
  const commentBody = typeof body.body === "string" ? body.body.trim() : "";

  if (
    !commentBody ||
    commentBody.length > 4_000 ||
    (scope === "SELECTION" && (!anchorMarkId || !quotedText))
  ) {
    await reportServerError(new Error("Invalid comment payload"), {
      source: "document-comment",
      operation: "invalid-body",
      status: 400,
      documentId,
    });
    return NextResponse.json(
      {
        error:
          !commentBody || commentBody.length > 4_000
            ? "Write a comment between 1 and 4,000 characters."
            : "The selected comment target is missing.",
      },
      { status: 400 },
    );
  }

  const admission = await prisma.$transaction(async (transaction) => {
    if (!(await lockDocumentForCommentAi(transaction, documentId))) {
      return { kind: "missing" as const };
    }

    await expireStaleCommentAiJobs(transaction, documentId);
    if (await hasActiveCommentAiJob(transaction, documentId)) {
      return { kind: "locked" as const };
    }

    const comment = await transaction.comment.create({
      data: {
        documentId,
        authorId: session.user.id,
        authorType: "USER",
        scope,
        anchorMarkId,
        quotedText,
        body: commentBody,
        aiStatus: "NOT_REQUESTED",
        aiStartedAt: null,
        aiCompletedAt: null,
      },
      include: { author: { select: { name: true } } },
    });
    return { kind: "created" as const, comment };
  });

  if (admission.kind === "missing") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (admission.kind === "locked") {
    return NextResponse.json(
      { error: DOCUMENT_AI_LOCK_MESSAGE, documentAiLocked: true },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { comment: admission.comment, aiProcessing: "queued" },
    { status: 201 },
  );
}
