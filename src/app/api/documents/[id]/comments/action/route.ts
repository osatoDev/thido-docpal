import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/react";
import { generateHTML } from "@tiptap/html/server";
import { DocumentRevisionSource } from "@prisma/client";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { anthropic } from "@/lib/ai/client";
import { commentBatchResponseSchema } from "@/lib/ai/schemas";
import {
  startAiGeneration,
  type TrackedAnthropicMessage,
} from "@/lib/ai/telemetry";
import { getUserAiModel } from "@/lib/ai/userModel";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { auth } from "@/lib/auth";
import { getDocumentForUser } from "@/lib/documentAuth";
import {
  DOCUMENT_AI_LOCK_MESSAGE,
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  lockDocumentForCommentAi,
} from "@/lib/documentAiJobs";
import { reconcileOrphanedComments } from "@/lib/documentComments";
import { getCommentPromptContext } from "@/lib/documentMarks";
import { getEditorExtensions } from "@/lib/editorExtensions";
import {
  AiAllowanceExceededError,
  checkAndConsumeAiAllowance,
  linkAiCreditChargeToGeneration,
  refundAiCreditCharge,
} from "@/lib/entitlements";
import {
  markdownToTiptapJSON,
  preserveDocumentPreferences,
} from "@/lib/markdownToTiptap";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { recordDocumentRevision } from "@/lib/documentRevisions";
import { reportServerError } from "@/lib/rollbar/server";

export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

class DocumentChangedDuringBatch extends Error {}

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();

  const { id: documentId } = await params;
  const editableDocument = await getDocumentForUser(
    documentId,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  if (!editableDocument) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const aiStartedAt = new Date();
  const admission = await prisma.$transaction(async (transaction) => {
    if (!(await lockDocumentForCommentAi(transaction, documentId))) {
      return { kind: "missing" as const };
    }

    await expireStaleCommentAiJobs(transaction, documentId, aiStartedAt);
    if (
      await hasActiveCommentAiJob(transaction, documentId, {
        now: aiStartedAt,
      })
    ) {
      return { kind: "locked" as const };
    }

    const document = await transaction.document.findUnique({
      where: { id: documentId },
      select: { content: true, revision: true },
    });
    if (!document) return { kind: "missing" as const };

    const comments = await transaction.comment.findMany({
      where: {
        documentId,
        parentId: null,
        authorType: "USER",
        status: "OPEN",
        aiStatus: { in: ["NOT_REQUESTED", "FAILED"] },
        suggestion: { is: null },
      },
      orderBy: { createdAt: "asc" },
      include: {
        replies: { orderBy: { createdAt: "asc" } },
      },
    });
    if (comments.length === 0) return { kind: "empty" as const };

    const commentIds = comments.map((comment) => comment.id);
    await transaction.comment.updateMany({
      where: { id: { in: commentIds } },
      data: {
        aiStatus: "PENDING",
        aiStartedAt,
        aiCompletedAt: null,
      },
    });

    return { kind: "claimed" as const, comments, document, commentIds };
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
  if (admission.kind === "empty") {
    return NextResponse.json(
      { error: "There are no comments waiting for Thido." },
      { status: 409 },
    );
  }

  const { comments, document, commentIds } = admission;
  const currentContent =
    document.content && typeof document.content === "object"
      ? (document.content as JSONContent)
      : null;
  const documentHtml = currentContent
    ? generateHTML(currentContent, getEditorExtensions())
    : "";
  const commentInstructions = comments
    .map((comment, index) => {
      const target =
        comment.scope === "SELECTION" && currentContent && comment.anchorMarkId
          ? getCommentPromptContext(currentContent, comment.anchorMarkId)
          : null;
      const thread = [comment, ...comment.replies]
        .filter((message) => message.authorType === "USER")
        .map((message) => `- ${message.body}`)
        .join("\n");

      return (
        `COMMENT ${index + 1}\n` +
        `ID: ${comment.id}\n` +
        `SCOPE: ${comment.scope === "DOCUMENT" ? "whole document" : "selected passage"}\n` +
        (comment.scope === "SELECTION"
          ? `CURRENT TARGET: ${target?.targetText || comment.quotedText || "(anchor no longer present)"}\n`
          : "") +
        `USER MESSAGES:\n${thread}`
      );
    })
    .join("\n\n---\n\n");

  let telemetry: Awaited<ReturnType<typeof startAiGeneration>> | undefined;
  let trackedMessage: TrackedAnthropicMessage | undefined;
  let chargeId: string | undefined;
  try {
    const model = await getUserAiModel(session.user.id);
    ({ chargeId } = await checkAndConsumeAiAllowance(
      session.user.id,
      "COMMENT_RESPOND_DOCUMENT",
      model,
      { documentId },
    ));
    if (!checkRateLimit(`ai:${session.user.id}`, 15, 60_000)) {
      throw new Error("Rate limited. Could not action these comments yet.");
    }

    telemetry = await startAiGeneration({
      feature: "COMMENT_RESPOND",
      model,
      userId: session.user.id,
      documentId,
      commentId: comments[0].id,
    });
    await linkAiCreditChargeToGeneration(chargeId, telemetry.id);
    const message = await anthropic.messages.parse({
      model,
      max_tokens: 16_000,
      output_config: { format: zodOutputFormat(commentBatchResponseSchema) },
      system:
        "You are Thido, an editorial assistant actioning a batch of comments on one document. " +
        "Read the complete document and every comment before editing. A selected passage identifies where the reviewer noticed a problem; it is context, not an edit boundary. " +
        "Use editorial judgment to make one coherent revision, and change other passages, sections, or structure when that is the best way to satisfy the comments. Reconcile overlapping or dependent comments instead of applying isolated patches. " +
        "Preserve content and structure that the comments do not require you to change. Return the complete revised document as clean Markdown in revised_document whenever at least one comment calls for a change; otherwise return null. " +
        "Return exactly one concise response for every supplied comment ID, explaining how it was handled or directly answering it. Never invent IDs and never reproduce editor-only data attributes.",
      messages: [
        {
          role: "user",
          content:
            `CURRENT DOCUMENT HTML:\n\"\"\"${documentHtml || "(empty document)"}\"\"\"\n\n` +
            `COMMENTS TO ACTION:\n${commentInstructions}`,
        },
      ],
    });
    trackedMessage = message;

    const parsed = message.parsed_output;
    if (!parsed) {
      throw new Error("AI batch response did not match the expected schema");
    }

    const knownCommentIds = new Set(commentIds);
    const responseByCommentId = new Map(
      parsed.responses
        .filter((response) => knownCommentIds.has(response.comment_id))
        .map((response) => [response.comment_id, response.reply]),
    );
    const proposedText = parsed.revised_document;
    const updatedContent =
      proposedText === null
        ? null
        : preserveDocumentPreferences(
            currentContent,
            await markdownToTiptapJSON(proposedText),
          );

    const result = await prisma.$transaction(async (transaction) => {
      if (!(await lockDocumentForCommentAi(transaction, documentId))) {
        throw new DocumentChangedDuringBatch();
      }
      const latest = await transaction.document.findUnique({
        where: { id: documentId },
        select: { revision: true },
      });
      if (!latest || latest.revision !== document.revision) {
        throw new DocumentChangedDuringBatch();
      }

      let nextRevision = latest.revision;
      if (updatedContent) {
        const updatedDocument = await transaction.document.update({
          where: { id: documentId },
          data: { content: updatedContent, revision: { increment: 1 } },
        });
        nextRevision = updatedDocument.revision;
        await recordDocumentRevision(transaction, updatedDocument, {
          source: DocumentRevisionSource.AI,
          actorId: session.user.id,
        });
        await transaction.suggestion.create({
          data: {
            commentId: comments[0].id,
            documentId,
            scope: "DOCUMENT",
            anchorMarkId: null,
            originalText: documentHtml,
            proposedText: proposedText!,
            status: "AUTO_APPLIED",
            resolvedAt: new Date(),
          },
        });
      }

      await transaction.comment.createMany({
        data: comments.map((comment) => ({
          documentId,
          authorType: "AI",
          parentId: comment.id,
          scope: comment.scope,
          anchorMarkId: comment.anchorMarkId,
          quotedText: comment.quotedText,
          body: responseByCommentId.get(comment.id) ?? parsed.summary,
        })),
      });
      await transaction.comment.updateMany({
        where: { id: { in: commentIds }, aiStatus: "PENDING" },
        data: {
          status: "RESOLVED",
          aiStatus: "SUCCEEDED",
          aiCompletedAt: new Date(),
        },
      });

      const refreshedComments = await transaction.comment.findMany({
        where: { documentId, parentId: null },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { name: true } } },
          },
          suggestion: true,
        },
      });
      return {
        comments: refreshedComments,
        content: updatedContent ?? currentContent,
        revision: nextRevision,
      };
    });

    await telemetry.succeed(message);
    if (updatedContent) {
      try {
        await reconcileOrphanedComments(prisma, documentId, updatedContent);
      } catch (error) {
        await reportServerError(error, {
          source: "document-comment-batch",
          operation: "reconcile-comments",
          documentId,
        });
      }
    }

    return NextResponse.json({
      comments: result.comments,
      documentContent: result.content,
      documentRevision: result.revision,
      changed: !!updatedContent,
      summary: parsed.summary,
    });
  } catch (error) {
    await telemetry?.fail(error, trackedMessage);
    // The comments stay queued for retry and the user gets no result, so
    // return the credits rather than charging for the abandoned attempt.
    if (chargeId) await refundAiCreditCharge(chargeId);
    await prisma.comment.updateMany({
      where: { id: { in: commentIds }, aiStatus: "PENDING" },
      data: { aiStatus: "FAILED", aiCompletedAt: new Date() },
    });

    const conflict = error instanceof DocumentChangedDuringBatch;
    if (!conflict && !(error instanceof AiAllowanceExceededError)) {
      await reportServerError(error, {
        source: "document-comment-batch",
        operation: "action",
        documentId,
      });
    }
    return NextResponse.json(
      {
        error: conflict
          ? "The document changed while Thido was working. Your comments are still queued; review the latest document and try again."
          : error instanceof AiAllowanceExceededError
            ? error.message
            : "Thido could not action these comments. They are still queued so you can try again.",
        documentConflict: conflict,
      },
      {
        status: conflict
          ? 409
          : error instanceof AiAllowanceExceededError
            ? 429
            : 500,
      },
    );
  }
}
