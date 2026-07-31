import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentAccessWhere, getDocumentForUser } from "@/lib/documentAuth";
import { collectCommentMarkIds } from "@/lib/documentMarks";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { isCommentMarkOnlyChange } from "@/lib/publicDocument";

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
  const data: { title?: string; content?: object } = {};
  if (
    editableDocument &&
    typeof body.title === "string" &&
    body.title.trim()
  ) {
    data.title = body.title.trim();
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

  const document = await prisma.document.update({
    where: { id },
    data,
  });

  if (body.content !== undefined) {
    await reconcileOrphanedComments(id, body.content as JSONContent);
  }

  return NextResponse.json({ document });
}

/**
 * Keeps `Comment.isOrphaned` in sync with whether the comment's anchored
 * text still exists in the document. Runs on every content save so a
 * comment whose highlighted span was deleted (or undone back into
 * existence) reflects that in the UI instead of silently going stale.
 */
async function reconcileOrphanedComments(documentId: string, content: JSONContent) {
  const presentIds = Array.from(collectCommentMarkIds(content));

  await prisma.$transaction([
    prisma.comment.updateMany({
      where: {
        documentId,
        scope: "SELECTION",
        isOrphaned: false,
        anchorMarkId: { notIn: presentIds },
      },
      data: { isOrphaned: true },
    }),
    prisma.comment.updateMany({
      where: {
        documentId,
        scope: "SELECTION",
        isOrphaned: true,
        anchorMarkId: { in: presentIds },
      },
      data: { isOrphaned: false },
    }),
  ]);
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

  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
