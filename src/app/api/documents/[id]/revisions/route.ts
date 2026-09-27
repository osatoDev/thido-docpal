import { DocumentRevisionSource, Prisma } from "@prisma/client";
import type { JSONContent } from "@tiptap/react";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { reconcileOrphanedComments } from "@/lib/documentComments";
import { documentAccessWhere, getDocumentForUser } from "@/lib/documentAuth";
import {
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  lockDocumentForCommentAi,
  DOCUMENT_AI_LOCK_MESSAGE,
} from "@/lib/documentAiJobs";
import { recordDocumentRevision } from "@/lib/documentRevisions";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();

  const query = new URL(request.url).searchParams;
  const before = query.get("before");
  const preview = query.get("revision");
  const isRevision = (value: string | null) =>
    value === null || (/^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647);
  if (!isRevision(before) || !isRevision(preview) || (before !== null && preview !== null)) {
    return NextResponse.json({ error: "Provide a valid revision or before cursor." }, { status: 400 });
  }
  const { id } = await params;
  const document = await prisma.document.findFirst({
    where: { id, AND: documentAccessWhere(session.user.id, session.user.email, "EDIT") },
    select: {
      revision: true,
      ownerId: true,
      historyRetention: { select: { keepAll: true, deleteAfter: true } },
    },
  });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A preview is an explicit request; list pages never fetch snapshot bodies.
  if (preview !== null) {
    const revision = await prisma.documentRevision.findUnique({
      where: { documentId_revision: { documentId: id, revision: Number(preview) } },
      select: { revision: true, title: true, content: true },
    });
    return revision
      ? NextResponse.json({ revision })
      : NextResponse.json({ error: "This version is no longer available." }, { status: 404 });
  }

  const page = await prisma.documentRevision.findMany({
    where: { documentId: id, ...(before === null ? {} : { revision: { lt: Number(before) } }) },
    orderBy: { revision: "desc" },
    take: 11,
    select: {
      revision: true,
      title: true,
      source: true,
      restoredFromRevision: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  });
  const revisions = page.slice(0, 10);
  return NextResponse.json({
    revisions,
    nextCursor: page.length > 10 ? revisions[revisions.length - 1].revision : null,
    currentRevision: document.revision,
    retention: {
      canManage: document.ownerId === session.user.id,
      keepAll: document.historyRetention?.keepAll ?? false,
      deleteAfter: document.historyRetention?.deleteAfter ?? null,
    },
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();

  const { id } = await params;
  const editableDocument = await getDocumentForUser(
    id,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  if (!editableDocument) {
    await reportServerError(new Error("Document not found"), {
      source: "document-revisions",
      operation: "post-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const targetRevision = Number.isInteger(body.revision) ? body.revision : null;
  const baseRevision = Number.isInteger(body.baseRevision)
    ? body.baseRevision
    : null;
  if (targetRevision === null || baseRevision === null) {
    await reportServerError(new Error("Invalid revision or baseRevision"), {
      source: "document-revisions",
      operation: "invalid-revision",
      status: 400,
      documentId: id,
    });
    return NextResponse.json(
      { error: "revision and baseRevision are required." },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (transaction) => {
    if (!(await lockDocumentForCommentAi(transaction, id))) {
      return { kind: "missing" as const };
    }
    const current = await transaction.document.findUnique({
      where: { id },
      select: { revision: true },
    });
    if (!current) return { kind: "missing" as const };
    if (current.revision !== baseRevision) {
      return {
        kind: "conflict" as const,
        currentRevision: current.revision,
      };
    }

    await expireStaleCommentAiJobs(transaction, id);
    if (await hasActiveCommentAiJob(transaction, id)) {
      return { kind: "locked" as const };
    }

    const target = await transaction.documentRevision.findUnique({
      where: {
        documentId_revision: { documentId: id, revision: targetRevision },
      },
      select: { revision: true, title: true, content: true },
    });
    if (!target) return { kind: "revision-missing" as const };

    const document = await transaction.document.update({
      where: { id },
      data: {
        title: target.title,
        content:
          target.content === null
            ? Prisma.DbNull
            : (target.content as Prisma.InputJsonValue),
        revision: { increment: 1 },
        isPlaceholder: false,
      },
    });
    await recordDocumentRevision(transaction, document, {
      source: DocumentRevisionSource.RESTORE,
      actorId: session.user.id,
      restoredFromRevision: target.revision,
    });
    return { kind: "restored" as const, document };
  });

  if (result.kind === "missing" || result.kind === "revision-missing") {
    await reportServerError(new Error("Document or revision not found"), {
      source: "document-revisions",
      operation: "restore-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (result.kind === "locked") {
    await reportServerError(new Error("Document AI locked"), {
      source: "document-revisions",
      operation: "restore-locked",
      status: 409,
      documentId: id,
    });
    return NextResponse.json(
      { error: DOCUMENT_AI_LOCK_MESSAGE },
      { status: 409 },
    );
  }
  if (result.kind === "conflict") {
    await reportServerError(new Error("Document revision conflict"), {
      source: "document-revisions",
      operation: "restore-conflict",
      status: 409,
      documentId: id,
    });
    return NextResponse.json(
      {
        error: "The document changed before this version could be restored.",
        documentConflict: true,
        currentRevision: result.currentRevision,
      },
      { status: 409 },
    );
  }

  if (result.document.content && typeof result.document.content === "object") {
    await reconcileOrphanedComments(
      prisma,
      id,
      result.document.content as JSONContent,
    );
  }

  return NextResponse.json({
    document: {
      title: result.document.title,
      content: result.document.content,
      revision: result.document.revision,
    },
  });
}
