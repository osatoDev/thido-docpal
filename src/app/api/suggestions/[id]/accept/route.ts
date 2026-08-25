import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/react";
import { DocumentRevisionSource, type Suggestion } from "@prisma/client";
import { generateHTML } from "@tiptap/html/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSuggestionForUser } from "@/lib/documentAuth";
import { replaceCommentMarkText, replaceUniqueText } from "@/lib/documentMarks";
import { markdownToTiptapJSON } from "@/lib/markdownToTiptap";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { unauthorizedResponse } from "@/lib/apiResponses";
import {
  DOCUMENT_AI_LOCK_MESSAGE,
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  lockDocumentForCommentAi,
} from "@/lib/documentAiJobs";
import { recordDocumentRevision } from "@/lib/documentRevisions";
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

class SuggestionResolutionConflict extends Error {}

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const { id } = await params;
  const suggestion = await getSuggestionForUser(
    id,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  if (!suggestion) {
    await reportServerError(new Error("Suggestion not found"), {
      source: "suggestion",
      operation: "not-found",
      status: 404,
      entryId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (suggestion.status !== "PENDING") {
    await reportServerError(new Error("Suggestion is not pending"), {
      source: "suggestion",
      operation: "not-pending",
      status: 409,
      entryId: id,
    });
    return NextResponse.json(
      { error: "Suggestion is not pending" },
      { status: 409 },
    );
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const document = await prisma.document.findUnique({
      where: { id: suggestion.documentId },
      select: { content: true, revision: true },
    });
    if (!document?.content) {
      await reportServerError(new Error("Document has no content"), {
        source: "suggestion",
        operation: "document-empty",
        status: 409,
        entryId: id,
      });
      return NextResponse.json(
        { error: "Document has no content" },
        { status: 409 },
      );
    }

    const content = document.content as JSONContent;
    if (
      suggestion.scope === "DOCUMENT" &&
      generateHTML(content, getEditorExtensions()) !== suggestion.originalText
    ) {
      await reportServerError(new Error("Document changed before suggestion accept"), {
        source: "suggestion",
        operation: "document-changed",
        status: 409,
        entryId: id,
      });
      return NextResponse.json(
        {
          error:
            "The document changed after this revision was prepared. Ask Thido to create a fresh document-wide revision.",
        },
        { status: 409 },
      );
    }
    const updatedContent =
      suggestion.scope === "DOCUMENT"
        ? await markdownToTiptapJSON(suggestion.proposedText)
        : suggestion.anchorMarkId
          ? replaceCommentMarkText(
              content,
              suggestion.anchorMarkId,
              suggestion.proposedText,
            ) ??
            replaceUniqueText(
              content,
              suggestion.originalText,
              suggestion.proposedText,
            )
          : null;

    if (!updatedContent) {
      await reportServerError(new Error("Suggestion could not be prepared"), {
        source: "suggestion",
        operation: "prepare-failed",
        status: 409,
        entryId: id,
      });
      return NextResponse.json(
        {
          error:
            suggestion.scope === "DOCUMENT"
              ? "The document-wide revision could not be prepared."
              : "The highlighted text has changed or is no longer unique in the document.",
        },
        { status: 409 },
      );
    }

    let result:
      | {
          kind: "resolved";
          suggestion: Suggestion | null;
          revision: number;
        }
      | { kind: "locked" }
      | { kind: "retry" };
    try {
      result = await prisma.$transaction(async (transaction) => {
        const documentExists = await lockDocumentForCommentAi(
          transaction,
          suggestion.documentId,
        );
        if (!documentExists) return { kind: "retry" as const };

        await expireStaleCommentAiJobs(transaction, suggestion.documentId);
        if (
          await hasActiveCommentAiJob(transaction, suggestion.documentId)
        ) {
          return { kind: "locked" as const };
        }

        const documentUpdate = await transaction.document.updateMany({
          where: {
            id: suggestion.documentId,
            revision: document.revision,
          },
          data: { content: updatedContent, revision: { increment: 1 } },
        });
        if (documentUpdate.count !== 1) return { kind: "retry" as const };

        const updatedDocument = await transaction.document.findUniqueOrThrow({
          where: { id: suggestion.documentId },
        });
        await recordDocumentRevision(transaction, updatedDocument, {
          source: DocumentRevisionSource.USER,
          actorId: session.user.id,
        });

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

        return {
          kind: "resolved" as const,
          suggestion: await transaction.suggestion.findUnique({ where: { id } }),
          revision: updatedDocument.revision,
        };
      });
    } catch (error) {
      if (error instanceof SuggestionResolutionConflict) {
        await reportServerError(error, {
          source: "suggestion",
          operation: "already-resolved",
          status: 409,
          entryId: id,
        });
        return NextResponse.json(
          { error: "This suggestion has already been resolved." },
          { status: 409 },
        );
      }
      throw error;
    }

    if (result.kind === "locked") {
      await reportServerError(new Error("Document AI locked"), {
        source: "suggestion",
        operation: "locked",
        status: 409,
        entryId: id,
      });
      return NextResponse.json(
        { error: DOCUMENT_AI_LOCK_MESSAGE },
        { status: 409 },
      );
    }
    if (result.kind === "resolved") {
      return NextResponse.json({
        suggestion: result.suggestion,
        document: { content: updatedContent, revision: result.revision },
      });
    }
  }

  await reportServerError(new Error("Document changed while accepting suggestion"), {
    source: "suggestion",
    operation: "accept-retry-exhausted",
    status: 409,
    entryId: id,
  });
  return NextResponse.json(
    { error: "The document changed while accepting. Please try again." },
    { status: 409 },
  );
}
