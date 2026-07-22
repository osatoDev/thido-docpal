import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedDocument } from "@/lib/documentAuth";
import { collectCommentMarkIds } from "@/lib/documentMarks";
import { unauthorizedResponse } from "@/lib/apiResponses";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const document = await prisma.document.findFirst({
    where: { id, ownerId: session.user.id },
    include: {
      promptAnswers: { orderBy: { order: "asc" } },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "asc" },
        include: {
          replies: { orderBy: { createdAt: "asc" } },
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
  const existing = await getOwnedDocument(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const data: { title?: string; content?: object } = {};
  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim();
  }
  if (body.content !== undefined) {
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
        isOrphaned: false,
        anchorMarkId: { notIn: presentIds },
      },
      data: { isOrphaned: true },
    }),
    prisma.comment.updateMany({
      where: {
        documentId,
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
  const existing = await getOwnedDocument(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
