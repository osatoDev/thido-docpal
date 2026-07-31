import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCommentForUser } from "@/lib/documentAuth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import {
  DOCUMENT_AI_LOCK_MESSAGE,
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  lockDocumentForCommentAi,
} from "@/lib/documentAiJobs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await getCommentForUser(
    id,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.status !== "OPEN" && body.status !== "RESOLVED") {
    return NextResponse.json(
      { error: "status must be OPEN or RESOLVED" },
      { status: 400 },
    );
  }

  const updateResult = await prisma.$transaction(async (transaction) => {
    const documentExists = await lockDocumentForCommentAi(
      transaction,
      existing.documentId,
    );
    if (!documentExists) return { kind: "missing" as const };

    await expireStaleCommentAiJobs(transaction, existing.documentId);
    if (
      await hasActiveCommentAiJob(transaction, existing.documentId, {
        documentWideOnly: true,
      })
    ) {
      return { kind: "locked" as const };
    }

    const comment = await transaction.comment.update({
      where: { id },
      data: { status: body.status },
    });
    return { kind: "updated" as const, comment };
  });
  if (updateResult.kind === "missing") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (updateResult.kind === "locked") {
    return NextResponse.json(
      { error: DOCUMENT_AI_LOCK_MESSAGE },
      { status: 409 },
    );
  }

  return NextResponse.json({ comment: updateResult.comment });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await getCommentForUser(
    id,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deleteResult = await prisma.$transaction(async (transaction) => {
    const documentExists = await lockDocumentForCommentAi(
      transaction,
      existing.documentId,
    );
    if (!documentExists) return "missing" as const;

    await expireStaleCommentAiJobs(transaction, existing.documentId);
    if (
      await hasActiveCommentAiJob(transaction, existing.documentId, {
        documentWideOnly: true,
      })
    ) {
      return "locked" as const;
    }

    await transaction.comment.delete({ where: { id } });
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

  return NextResponse.json({ ok: true });
}
