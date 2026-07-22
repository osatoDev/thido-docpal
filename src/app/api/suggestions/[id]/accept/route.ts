import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedSuggestion } from "@/lib/documentAuth";
import { replaceCommentMarkText } from "@/lib/documentMarks";
import { unauthorizedResponse } from "@/lib/apiResponses";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const suggestion = await getOwnedSuggestion(id, session.user.id);
  if (!suggestion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (suggestion.status !== "PENDING") {
    return NextResponse.json(
      { error: "Suggestion is not pending" },
      { status: 409 },
    );
  }

  const document = await prisma.document.findUnique({
    where: { id: suggestion.documentId },
  });
  if (!document?.content) {
    return NextResponse.json({ error: "Document has no content" }, { status: 409 });
  }

  const updatedContent = replaceCommentMarkText(
    document.content as JSONContent,
    suggestion.anchorMarkId,
    suggestion.proposedText,
  );
  if (!updatedContent) {
    return NextResponse.json(
      { error: "The highlighted text no longer exists in the document" },
      { status: 409 },
    );
  }

  const [, updatedSuggestion] = await prisma.$transaction([
    prisma.document.update({
      where: { id: suggestion.documentId },
      data: { content: updatedContent },
    }),
    prisma.suggestion.update({
      where: { id },
      data: { status: "ACCEPTED", resolvedAt: new Date() },
    }),
    prisma.comment.update({
      where: { id: suggestion.commentId },
      data: { status: "RESOLVED" },
    }),
  ]);

  return NextResponse.json({
    suggestion: updatedSuggestion,
    document: { content: updatedContent },
  });
}
