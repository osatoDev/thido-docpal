import { NextResponse } from "next/server";
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

  let aiReply = null;
  let suggestion = null;
  let updatedDocumentContent: JSONContent | null = null;

  try {
    if (!checkRateLimit(`ai:${session.user.id}`, 15, 60_000)) {
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
        where: { userId: session.user.id },
      });
      const mode = settings?.aiCommentMode ?? "PROPOSE";

      aiReply = await prisma.comment.create({
        data: {
          documentId,
          authorType: "AI",
          parentId: comment.id,
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
        if (mode === "AUTO_APPLY" && document.content) {
          const updatedContent = replaceCommentMarkText(
            document.content as JSONContent,
            anchorMarkId,
            parsed.proposed_text,
          );

          if (updatedContent) {
            await prisma.document.update({
              where: { id: documentId },
              data: { content: updatedContent },
            });
            updatedDocumentContent = updatedContent;
          }

          suggestion = await prisma.suggestion.create({
            data: {
              commentId: comment.id,
              documentId,
              anchorMarkId,
              originalText: quotedText,
              proposedText: parsed.proposed_text,
              status: updatedContent ? "AUTO_APPLIED" : "PENDING",
              resolvedAt: updatedContent ? new Date() : null,
            },
          });

          await prisma.comment.update({
            where: { id: comment.id },
            data: { status: "RESOLVED" },
          });
        } else {
          suggestion = await prisma.suggestion.create({
            data: {
              commentId: comment.id,
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
    // The user's comment is already saved; the AI reply is best-effort.
    console.error("AI comment response failed", error);
  }

  return NextResponse.json({
    comment,
    aiReply,
    suggestion,
    documentContent: updatedDocumentContent,
  });
}
