import { after, NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedDocument } from "@/lib/documentAuth";
import { anthropic, CLAUDE_MODEL } from "@/lib/ai/client";
import { commentResponseSchema } from "@/lib/ai/schemas";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { replaceCommentMarkText } from "@/lib/documentMarks";
import { checkRateLimit } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: documentId } = await params;
  const document = await prisma.document.findFirst({
    where: { id: documentId, ownerId: session.user.id },
    select: {
      content: true,
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "desc" },
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

  return NextResponse.json({
    comments: document.comments,
    documentContent: document.content,
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: documentId } = await params;
  const document = await getOwnedDocument(documentId, session.user.id);
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
  });

  after(async () => {
    await generateAiResponse({
      commentId: comment.id,
      documentId,
      userId: session.user.id,
      anchorMarkId,
      quotedText,
      commentBody,
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
}: {
  commentId: string;
  documentId: string;
  userId: string;
  anchorMarkId: string;
  quotedText: string;
  commentBody: string;
}) {

  try {
    if (!checkRateLimit(`ai:${userId}`, 15, 60_000)) {
      throw new Error("Rate limited — skipping AI response for this comment");
    }

    const message = await anthropic.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      output_config: {
        effort: "low",
        format: zodOutputFormat(commentResponseSchema),
      },
      system:
        "You are an editorial assistant embedded in a document editor. A " +
        "user has highlighted a span of text and left a comment on it — " +
        "either a question, general feedback, or a request to change the " +
        "text. Classify which it is, and respond:\n" +
        "- For a question or feedback: write a short, direct reply " +
        "answering it or acknowledging it. Do not propose replacement " +
        "text.\n" +
        "- For a change request: write a one-sentence reply describing " +
        "the edit you're making, and provide the full replacement text " +
        "for the highlighted span in proposed_text (matching its style " +
        "and length unless asked otherwise).",
      messages: [
        {
          role: "user",
          content: `Highlighted text: "${quotedText}"\n\nComment: ${commentBody}`,
        },
      ],
    });

    const parsed = message.parsed_output;
    if (parsed) {
      const settings = await prisma.userSettings.findUnique({
        where: { userId },
      });
      const mode = settings?.aiCommentMode ?? "PROPOSE";

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
  } catch (error) {
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
