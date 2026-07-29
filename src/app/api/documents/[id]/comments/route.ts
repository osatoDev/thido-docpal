import { after, NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/react";
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
  getCommentPromptContext,
  replaceCommentMarkText,
} from "@/lib/documentMarks";
import { checkRateLimit } from "@/lib/rateLimit";
import { unauthorizedResponse } from "@/lib/apiResponses";

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

  return NextResponse.json({
    comments: document.comments,
    documentContent: document.content,
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id: documentId } = await params;
  const document = await getDocumentForUser(
    documentId,
    session.user.id,
    session.user.email,
    "COMMENT",
  );
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const anchorMarkId = typeof body.anchorMarkId === "string" ? body.anchorMarkId : null;
  const quotedText = typeof body.quotedText === "string" ? body.quotedText : null;
  const commentBody = typeof body.body === "string" ? body.body.trim() : "";

  if (!anchorMarkId || !quotedText || !commentBody) {
    return NextResponse.json(
      { error: "anchorMarkId, quotedText, and body are required" },
      { status: 400 },
    );
  }

  // Create the user's comment immediately — this is what makes the thread
  // feel instant even before the AI portion of the response comes back.
  const comment = await prisma.comment.create({
    data: {
      documentId,
      authorId: session.user.id,
      authorType: "USER",
      anchorMarkId,
      quotedText,
      body: commentBody,
    },
    include: { author: { select: { name: true } } },
  });

  after(async () => {
    const editAccess = await getDocumentForUser(
      documentId,
      session.user.id,
      session.user.email,
      "EDIT",
    );
    await generateAiResponse({
      commentId: comment.id,
      documentId,
      userId: session.user.id,
      anchorMarkId,
      quotedText,
      commentBody,
      allowAutoApply: !!editAccess,
    });
  });

  return NextResponse.json({ comment }, { status: 201 });
}

async function generateAiResponse({
  commentId,
  documentId,
  userId,
  anchorMarkId,
  quotedText,
  commentBody,
  allowAutoApply,
}: {
  commentId: string;
  documentId: string;
  userId: string;
  anchorMarkId: string;
  quotedText: string;
  commentBody: string;
  allowAutoApply: boolean;
}) {
  let telemetry:
    | Awaited<ReturnType<typeof startAiGeneration>>
    | undefined;
  let trackedMessage: TrackedAnthropicMessage | undefined;

  try {
    if (!checkRateLimit(`ai:${userId}`, 15, 60_000)) {
      throw new Error("Rate limited — skipping AI response for this comment");
    }

    const latestDocument = await prisma.document.findUnique({
      where: { id: documentId },
      select: { content: true },
    });
    const promptContext =
      latestDocument?.content &&
      typeof latestDocument.content === "object"
        ? getCommentPromptContext(
            latestDocument.content as JSONContent,
            anchorMarkId,
          )
        : null;
    const model = await getUserAiModel(userId);
    telemetry = await startAiGeneration({
      feature: "COMMENT_RESPOND",
      model,
      userId,
      documentId,
      commentId,
    });
    const message = await anthropic.messages.parse({
      model,
      max_tokens: 1024,
      output_config: {
        format: zodOutputFormat(commentResponseSchema),
      },
      system:
        "You are an editorial assistant embedded in a document editor. A " +
        "user has commented on an editable target span. The target may be " +
        "their exact original selection or a deliberately expanded paragraph " +
        "scope when the request clearly called for a broader rewrite. You " +
        "may use the surrounding context to interpret meaning, tone, and " +
        "references, but only the TARGET TEXT is editable.\n" +
        "Classify the request and respond:\n" +
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
            `TARGET TEXT:\n"""${quotedText}"""\n\n` +
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
      const mode =
        allowAutoApply && settings?.aiCommentMode === "AUTO_APPLY"
          ? "AUTO_APPLY"
          : "PROPOSE";

      await prisma.comment.create({
        data: {
          documentId,
          authorType: "AI",
          parentId: commentId,
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
        if (mode === "AUTO_APPLY") {
          const updatedContent = await applyReplacementWithoutClobbering({
            documentId,
            anchorMarkId,
            proposedText: parsed.proposed_text,
          });

          await prisma.suggestion.create({
            data: {
              commentId,
              documentId,
              anchorMarkId,
              originalText: quotedText,
              proposedText: parsed.proposed_text,
              status: updatedContent ? "AUTO_APPLIED" : "PENDING",
              resolvedAt: updatedContent ? new Date() : null,
            },
          });

          await prisma.comment.update({
            where: { id: commentId },
            data: { status: "RESOLVED" },
          });
        } else {
          await prisma.suggestion.create({
            data: {
              commentId,
              documentId,
              anchorMarkId,
              originalText: quotedText,
              proposedText: parsed.proposed_text,
            },
          });
        }
      }
    }
    await telemetry.succeed(message);
  } catch (error) {
    await telemetry?.fail(error, trackedMessage);
    // The user's comment is already saved; the background AI response is
    // best-effort and must never block further editor interaction.
    console.error("AI comment response failed", error);
  }
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
