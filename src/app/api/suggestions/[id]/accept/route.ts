import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSuggestionForUser } from "@/lib/documentAuth";
import {
  replaceCommentMarkText,
  replaceUniqueText,
} from "@/lib/documentMarks";
import { unauthorizedResponse } from "@/lib/apiResponses";

type Params = { params: Promise<{ id: string }> };

class SuggestionResolutionConflict extends Error {}

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const suggestion = await getSuggestionForUser(
    id,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  if (!suggestion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (suggestion.status !== "PENDING") {
    return NextResponse.json(
      { error: "Suggestion is not pending" },
      { status: 409 },
    );
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const document = await prisma.document.findUnique({
      where: { id: suggestion.documentId },
      select: { content: true, updatedAt: true },
    });
    if (!document?.content) {
      return NextResponse.json(
        { error: "Document has no content" },
        { status: 409 },
      );
    }

    const content = document.content as JSONContent;
    const updatedContent =
      replaceCommentMarkText(
        content,
        suggestion.anchorMarkId,
        suggestion.proposedText,
      ) ??
      replaceUniqueText(
        content,
        suggestion.originalText,
        suggestion.proposedText,
      );

    if (!updatedContent) {
      return NextResponse.json(
        {
          error:
            "The highlighted text has changed or is no longer unique in the document.",
        },
        { status: 409 },
      );
    }

    let result;
    try {
      result = await prisma.$transaction(async (transaction) => {
        const documentUpdate = await transaction.document.updateMany({
          where: {
            id: suggestion.documentId,
            updatedAt: document.updatedAt,
          },
          data: { content: updatedContent },
        });
        if (documentUpdate.count !== 1) return null;

        const suggestionUpdate = await transaction.suggestion.updateMany({
          where: { id, status: "PENDING" },
          data: { status: "ACCEPTED", resolvedAt: new Date() },
        });
        if (suggestionUpdate.count !== 1) {
          throw new SuggestionResolutionConflict();
        }

        await transaction.comment.update({
          where: { id: suggestion.commentId },
          data: { status: "RESOLVED" },
        });

        return transaction.suggestion.findUnique({ where: { id } });
      });
    } catch (error) {
      if (error instanceof SuggestionResolutionConflict) {
        return NextResponse.json(
          { error: "This suggestion has already been resolved." },
          { status: 409 },
        );
      }
      throw error;
    }

    if (result) {
      return NextResponse.json({
        suggestion: result,
        document: { content: updatedContent },
      });
    }
  }

  return NextResponse.json(
    { error: "The document changed while accepting. Please try again." },
    { status: 409 },
  );
}
