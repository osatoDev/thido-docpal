import { NextResponse } from "next/server";

import { unauthorizedResponse } from "@/lib/apiResponses";
import { auth } from "@/lib/auth";
import { getCommentForUser } from "@/lib/documentAuth";
import {
  DOCUMENT_AI_LOCK_MESSAGE,
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  lockDocumentForCommentAi,
} from "@/lib/documentAiJobs";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();

  const { id } = await params;
  const existing = await getCommentForUser(
    id,
    session.user.id,
    session.user.email,
    "COMMENT",
  );
  if (!existing || existing.parentId) {
    await reportServerError(new Error("Comment thread not found"), {
      source: "comment-reply",
      operation: "not-found",
      status: 404,
      entryId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = await request.json().catch(() => ({}));
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 4_000) {
    return NextResponse.json(
      { error: "Write a message between 1 and 4,000 characters." },
      { status: 400 },
    );
  }
  if (existing.status !== "OPEN") {
    return NextResponse.json(
      { error: "Reopen this comment before adding another message." },
      { status: 409 },
    );
  }

  const result = await prisma.$transaction(async (transaction) => {
    if (!(await lockDocumentForCommentAi(transaction, existing.documentId))) {
      return { kind: "missing" as const };
    }

    await expireStaleCommentAiJobs(transaction, existing.documentId);
    if (await hasActiveCommentAiJob(transaction, existing.documentId)) {
      return { kind: "locked" as const };
    }

    await transaction.comment.create({
      data: {
        documentId: existing.documentId,
        authorId: session.user.id,
        authorType: "USER",
        parentId: id,
        scope: existing.scope,
        anchorMarkId: existing.anchorMarkId,
        quotedText: existing.quotedText,
        body,
      },
    });
    if (!existing.suggestion) {
      await transaction.comment.update({
        where: { id },
        data: {
          aiStatus: "NOT_REQUESTED",
          aiStartedAt: null,
          aiCompletedAt: null,
        },
      });
    }
    return { kind: "created" as const };
  });

  if (result.kind === "missing") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (result.kind === "locked") {
    return NextResponse.json(
      { error: DOCUMENT_AI_LOCK_MESSAGE, documentAiLocked: true },
      { status: 409 },
    );
  }

  const comment = await prisma.comment.findUniqueOrThrow({
    where: { id },
    include: {
      author: { select: { name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
      suggestion: true,
    },
  });
  return NextResponse.json(
    { comment, aiProcessing: existing.suggestion ? "saved" : "queued" },
    { status: 201 },
  );
}
