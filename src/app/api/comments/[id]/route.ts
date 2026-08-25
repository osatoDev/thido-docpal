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
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await getCommentForUser(
    id,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  if (!existing) {
    await reportServerError(new Error("Comment not found"), {
      source: "comment",
      operation: "patch-not-found",
      status: 404,
      entryId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.status !== "OPEN" && body.status !== "RESOLVED") {
    await reportServerError(new Error("Invalid comment status"), {
      source: "comment",
      operation: "invalid-status",
      status: 400,
      entryId: id,
    });
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
    if (await hasActiveCommentAiJob(transaction, existing.documentId)) {
      return { kind: "locked" as const };
    }

    const comment = await transaction.comment.update({
      where: { id },
      data: { status: body.status },
    });
    return { kind: "updated" as const, comment };
  });
  if (updateResult.kind === "missing") {
    await reportServerError(new Error("Document missing during comment update"), {
      source: "comment",
      operation: "patch-document-missing",
      status: 404,
      entryId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (updateResult.kind === "locked") {
    await reportServerError(new Error("Document AI locked"), {
      source: "comment",
      operation: "patch-locked",
      status: 409,
      entryId: id,
    });
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
    return await unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await getCommentForUser(
    id,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  if (!existing) {
    await reportServerError(new Error("Comment not found"), {
      source: "comment",
      operation: "delete-not-found",
      status: 404,
      entryId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deleteResult = await prisma.$transaction(async (transaction) => {
    const documentExists = await lockDocumentForCommentAi(
      transaction,
      existing.documentId,
    );
    if (!documentExists) return "missing" as const;

    await expireStaleCommentAiJobs(transaction, existing.documentId);
    if (await hasActiveCommentAiJob(transaction, existing.documentId)) {
      return "locked" as const;
    }

    await transaction.comment.delete({ where: { id } });
    return "deleted" as const;
  });
  if (deleteResult === "missing") {
    await reportServerError(new Error("Document missing during comment delete"), {
      source: "comment",
      operation: "delete-document-missing",
      status: 404,
      entryId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (deleteResult === "locked") {
    await reportServerError(new Error("Document AI locked"), {
      source: "comment",
      operation: "delete-locked",
      status: 409,
      entryId: id,
    });
    return NextResponse.json(
      { error: DOCUMENT_AI_LOCK_MESSAGE },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
