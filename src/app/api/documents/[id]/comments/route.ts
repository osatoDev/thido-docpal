import { after, NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/react";
import { generateHTML } from "@tiptap/html/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  documentAccessWhere,
  getDocumentForUser,
} from "@/lib/documentAuth";
import { anthropic } from "@/lib/ai/client";
import { getUserAiModel } from "@/lib/ai/userModel";
import { commentResponseSchema } from "@/lib/ai/schemas";
import {
  startAiGeneration,
  type TrackedAnthropicMessage,
} from "@/lib/ai/telemetry";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  getDocumentText,
  getCommentPromptContext,
  replaceCommentMarkText,
} from "@/lib/documentMarks";
import {
  isDocumentWideCommentRequest,
  shouldApplyCommentSuggestion,
} from "@/lib/commentProcessing";
import { markdownToTiptapJSON } from "@/lib/markdownToTiptap";
import { checkRateLimit } from "@/lib/rateLimit";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { getEditorExtensions } from "@/lib/editorExtensions";
import {
  COMMENT_AI_BUSY_MESSAGE,
  DOCUMENT_AI_LOCK_MESSAGE,
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  isCommentAiJobActive,
  lockDocumentForCommentAi,
} from "@/lib/documentAiJobs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id: documentId } = await params;
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      AND: documentAccessWhere(
        session.user.id,
        session.user.email,
        "VIEW",
      ),
    },
    select: {
      content: true,
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "desc" },
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
  await expireStaleCommentAiJobs(prisma, documentId);

  const aiProgress = Object.fromEntries(
    document.comments.flatMap((comment) => {
      const isActive = isCommentAiJobActive(comment);
      return comment.aiStatus === "PENDING" || comment.aiStatus === "FAILED"
        ? [
            [
              comment.id,
              {
                status: isActive ? "PENDING" : "FAILED",
                startedAt: comment.aiStartedAt?.toISOString() ?? null,
              },
            ],
          ]
        : [];
    }),
  );
  const documentAiLocked = document.comments.some(
    (comment) =>
      comment.scope === "DOCUMENT" && isCommentAiJobActive(comment),
  );

  return NextResponse.json({
    comments: document.comments,
    aiProgress,
    documentContent: document.content,
    documentAiLocked,
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }
  const userId = session.user.id;
  const userEmail = session.user.email;

  const { id: documentId } = await params;
  const document = await getDocumentForUser(
    documentId,
    userId,
    userEmail,
    "COMMENT",
  );
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const scope = body.scope === "DOCUMENT" ? "DOCUMENT" : "SELECTION";
  const anchorMarkId =
    scope === "SELECTION" && typeof body.anchorMarkId === "string"
      ? body.anchorMarkId
      : null;
  const quotedText =
    scope === "SELECTION" && typeof body.quotedText === "string"
      ? body.quotedText
      : null;
  const commentBody = typeof body.body === "string" ? body.body.trim() : "";

  if (
    !commentBody ||
    (scope === "SELECTION" && (!anchorMarkId || !quotedText))
  ) {
    return NextResponse.json(
      {
        error:
          scope === "DOCUMENT"
            ? "body is required"
            : "anchorMarkId, quotedText, and body are required",
      },
      { status: 400 },
    );
  }

  const waitForAi =
    scope === "DOCUMENT" || isDocumentWideCommentRequest(commentBody);
  const aiStartedAt = new Date();
  const admission = await prisma.$transaction(async (transaction) => {
    const documentExists = await lockDocumentForCommentAi(
      transaction,
      documentId,
    );
    if (!documentExists) return { kind: "missing" as const };

    await expireStaleCommentAiJobs(transaction, documentId, aiStartedAt);
    const conflictingJob = await hasActiveCommentAiJob(
      transaction,
      documentId,
      {
        documentWideOnly: scope !== "DOCUMENT",
        now: aiStartedAt,
      },
    );
    if (conflictingJob) {
      const documentAiLocked = await hasActiveCommentAiJob(
        transaction,
        documentId,
        {
          documentWideOnly: true,
          now: aiStartedAt,
        },
      );
      return {
        kind: "locked" as const,
        documentAiLocked,
      };
    }

    const comment = await transaction.comment.create({
      data: {
        documentId,
        authorId: userId,
        authorType: "USER",
        scope,
        anchorMarkId,
        quotedText,
        body: commentBody,
        aiStatus: "PENDING",
        aiStartedAt,
      },
      include: { author: { select: { name: true } } },
    });
    return { kind: "created" as const, comment };
  });
  if (admission.kind === "missing") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (admission.kind === "locked") {
    return NextResponse.json(
      {
        error: admission.documentAiLocked
          ? DOCUMENT_AI_LOCK_MESSAGE
          : COMMENT_AI_BUSY_MESSAGE,
        documentAiLocked: admission.documentAiLocked,
      },
      { status: 409 },
    );
  }
  const comment = admission.comment;

  async function respondToComment() {
    try {
      const editAccess = await getDocumentForUser(
        documentId,
        userId,
        userEmail,
        "EDIT",
      );
      return await generateAiResponse({
        commentId: comment.id,
        documentId,
        userId,
        scope,
        anchorMarkId,
        quotedText,
        commentBody,
        allowAutoApply: !!editAccess,
      });
    } catch (error) {
      await finishCommentAiJob(comment.id, "FAILED");
      console.error("Could not prepare the AI comment response", error);
      return false;
    }
  }

  if (!waitForAi) {
    after(async () => {
      await respondToComment();
    });
    return NextResponse.json(
      { comment, aiProcessing: "background" },
      { status: 201 },
    );
  }

  const aiCompleted = await respondToComment();
  const completedComment = await prisma.comment.findUnique({
    where: { id: comment.id },
    include: {
      author: { select: { name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
      suggestion: true,
    },
  });
  const documentContent =
    completedComment?.suggestion?.status === "AUTO_APPLIED"
      ? (
          await prisma.document.findUnique({
            where: { id: documentId },
            select: { content: true },
          })
        )?.content
      : null;

  return NextResponse.json(
    {
      comment: completedComment ?? comment,
      aiProcessing: aiCompleted ? "completed" : "failed",
      documentContent,
    },
    { status: 201 },
  );
}

async function generateAiResponse({
  commentId,
  documentId,
  userId,
  scope,
  anchorMarkId,
  quotedText,
  commentBody,
  allowAutoApply,
}: {
  commentId: string;
  documentId: string;
  userId: string;
  scope: "SELECTION" | "DOCUMENT";
  anchorMarkId: string | null;
  quotedText: string | null;
  commentBody: string;
  allowAutoApply: boolean;
}) {
  let telemetry:
    | Awaited<ReturnType<typeof startAiGeneration>>
    | undefined;
  let trackedMessage: TrackedAnthropicMessage | undefined;

  try {
    const latestDocument = await prisma.document.findUnique({
      where: { id: documentId },
      select: { content: true, updatedAt: true },
    });
    const latestContent =
      latestDocument?.content && typeof latestDocument.content === "object"
        ? (latestDocument.content as JSONContent)
        : null;
    const documentText = latestContent ? getDocumentText(latestContent) : "";
    const documentHtml = latestContent
      ? generateHTML(latestContent, getEditorExtensions())
      : "";
    const promptContext =
      scope === "SELECTION" && latestContent && anchorMarkId
        ? getCommentPromptContext(
            latestContent,
            anchorMarkId,
          )
        : null;
    if (scope === "DOCUMENT" && !documentText) {
      throw new Error("The document has no text to review");
    }
    if (scope === "SELECTION" && (!anchorMarkId || !quotedText)) {
      throw new Error("The selected comment target is missing");
    }
    const model = await getUserAiModel(userId);
    telemetry = await startAiGeneration({
      feature: "COMMENT_RESPOND",
      model,
      userId,
      documentId,
      commentId,
    });
    if (!checkRateLimit(`ai:${userId}`, 15, 60_000)) {
      throw new Error("Rate limited — skipping AI response for this comment");
    }
    const message = await anthropic.messages.parse({
      model,
      max_tokens: scope === "DOCUMENT" ? 16000 : 1024,
      output_config: {
        format: zodOutputFormat(commentResponseSchema),
      },
      system:
        scope === "DOCUMENT"
          ? "You are an editorial assistant embedded in a document editor. " +
            "The user deliberately made a comment that applies to the ENTIRE " +
            "DOCUMENT, so the complete document is editable.\n" +
            "Classify the request and respond:\n" +
            "- Set suggestion_action to apply only when the user clearly " +
            "instructs you to edit the document now. Set it to propose for " +
            "questions, feedback, requests for advice, ambiguous prompts, " +
            "or when the user asks whether an edit should be made. Polite " +
            "direct edit requests such as ‘Please add…’ or ‘Can you add…’ " +
            "still count as change requests with apply.\n" +
            "- For a question or feedback: write a short, direct reply and do " +
            "not provide replacement text.\n" +
            "- For a change request: write a one-sentence reply describing " +
            "the edit, and provide the complete revised document in " +
            "proposed_text. Preserve all content and structure the request " +
            "does not ask you to change. The document is supplied as HTML so " +
            "its structure is unambiguous; return the revised document as " +
            "clean Markdown suitable for conversion back into the editor. " +
            "Do not reproduce editor-only data attributes."
          : "You are an editorial assistant embedded in a document editor. A " +
            "user has commented on an editable target span. The target may be " +
            "their exact original selection or a deliberately expanded paragraph " +
            "scope when the request clearly called for a broader rewrite. You " +
            "may use the surrounding context to interpret meaning, tone, and " +
            "references, but only the TARGET TEXT is editable.\n" +
            "Classify the request and respond:\n" +
            "- Set suggestion_action to apply only when the user clearly " +
            "instructs you to edit the target now. Set it to propose for " +
            "questions, feedback, requests for advice, ambiguous prompts, " +
            "or when the user asks whether an edit should be made. Polite " +
            "direct edit requests such as ‘Please add…’ or ‘Can you add…’ " +
            "still count as change requests with apply.\n" +
            "- For a question or feedback: write a short, direct reply " +
            "answering it or acknowledging it. Do not propose replacement " +
            "text.\n" +
            "- For a change request: write a one-sentence reply describing " +
            "the edit you're making, and provide the full replacement text " +
            "for the TARGET TEXT in proposed_text (matching its style " +
            "and length unless asked otherwise). Never rewrite text outside " +
            "the target span.",
      messages: [
        {
          role: "user",
          content:
            scope === "DOCUMENT"
              ? `ENTIRE DOCUMENT HTML:\n"""${documentHtml}"""\n\nCOMMENT:\n${commentBody}`
              : `TARGET TEXT:\n"""${quotedText}"""\n\n` +
                `COMMENT:\n${commentBody}\n\n` +
                `CONTAINING BLOCK:\n"""${promptContext?.blockText || quotedText}"""\n\n` +
                `CONTEXT BEFORE TARGET:\n"""${promptContext?.beforeText || "(none)"}"""\n\n` +
                `CONTEXT AFTER TARGET:\n"""${promptContext?.afterText || "(none)"}"""`,
        },
      ],
    });
    trackedMessage = message;

    const parsed = message.parsed_output;
    if (!parsed) {
      throw new Error("AI comment response did not match the expected schema");
    }
    if (parsed) {
      const settings = await prisma.userSettings.findUnique({
        where: { userId },
      });
      const autoApply = shouldApplyCommentSuggestion({
        mode: settings?.aiCommentMode ?? "AUTO",
        suggestionAction: parsed.suggestion_action,
        allowAutoApply,
      });

      await prisma.comment.create({
        data: {
          documentId,
          authorType: "AI",
          parentId: commentId,
          scope,
          anchorMarkId,
          quotedText,
          body: parsed.reply,
          intent:
            parsed.intent === "question"
              ? "QUESTION"
              : parsed.intent === "change_request"
                ? "CHANGE_REQUEST"
                : "FEEDBACK",
        },
      });

      if (parsed.intent === "change_request" && parsed.proposed_text) {
        if (autoApply) {
          const updatedContent =
            scope === "DOCUMENT"
              ? await applyDocumentReplacementWithoutClobbering({
                  documentId,
                  expectedUpdatedAt: latestDocument?.updatedAt,
                  proposedText: parsed.proposed_text,
                })
              : await applyReplacementWithoutClobbering({
                  documentId,
                  anchorMarkId: anchorMarkId!,
                  proposedText: parsed.proposed_text,
                });

          await prisma.suggestion.create({
            data: {
              commentId,
              documentId,
              scope,
              anchorMarkId,
              originalText:
                scope === "DOCUMENT" ? documentHtml : quotedText!,
              proposedText: parsed.proposed_text,
              status: updatedContent ? "AUTO_APPLIED" : "PENDING",
              resolvedAt: updatedContent ? new Date() : null,
            },
          });

          if (updatedContent) {
            await prisma.comment.update({
              where: { id: commentId },
              data: { status: "RESOLVED" },
            });
          }
        } else {
          await prisma.suggestion.create({
            data: {
              commentId,
              documentId,
              scope,
              anchorMarkId,
              originalText:
                scope === "DOCUMENT" ? documentHtml : quotedText!,
              proposedText: parsed.proposed_text,
            },
          });
        }
      }
    }
    await telemetry.succeed(message);
    await finishCommentAiJob(commentId, "SUCCEEDED");
    return true;
  } catch (error) {
    await telemetry?.fail(error, trackedMessage);
    await finishCommentAiJob(commentId, "FAILED");
    console.error("AI comment response failed", error);
    return false;
  }
}

async function finishCommentAiJob(
  commentId: string,
  status: "SUCCEEDED" | "FAILED",
) {
  await prisma.comment.updateMany({
    where: { id: commentId, aiStatus: "PENDING" },
    data: {
      aiStatus: status,
      aiCompletedAt: new Date(),
    },
  });
}

async function applyDocumentReplacementWithoutClobbering({
  documentId,
  expectedUpdatedAt,
  proposedText,
}: {
  documentId: string;
  expectedUpdatedAt?: Date;
  proposedText: string;
}): Promise<JSONContent | null> {
  if (!expectedUpdatedAt) return null;
  const updatedContent = await markdownToTiptapJSON(proposedText);
  const update = await prisma.document.updateMany({
    where: { id: documentId, updatedAt: expectedUpdatedAt },
    data: { content: updatedContent },
  });
  return update.count === 1 ? updatedContent : null;
}

async function applyReplacementWithoutClobbering({
  documentId,
  anchorMarkId,
  proposedText,
}: {
  documentId: string;
  anchorMarkId: string;
  proposedText: string;
}): Promise<JSONContent | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const latest = await prisma.document.findUnique({
      where: { id: documentId },
      select: { content: true, updatedAt: true },
    });
    if (!latest?.content) return null;

    const updatedContent = replaceCommentMarkText(
      latest.content as JSONContent,
      anchorMarkId,
      proposedText,
    );
    if (!updatedContent) return null;

    const update = await prisma.document.updateMany({
      where: { id: documentId, updatedAt: latest.updatedAt },
      data: { content: updatedContent },
    });
    if (update.count === 1) return updatedContent;
  }

  return null;
}
