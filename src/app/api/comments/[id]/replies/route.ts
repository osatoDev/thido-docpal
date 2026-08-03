import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/react";

import { anthropic } from "@/lib/ai/client";
import {
  startAiGeneration,
  type TrackedAnthropicMessage,
} from "@/lib/ai/telemetry";
import { getUserAiModel } from "@/lib/ai/userModel";
import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { formatCommentConversation } from "@/lib/commentConversation";
import { getCommentForUser } from "@/lib/documentAuth";
import {
  COMMENT_AI_BUSY_MESSAGE,
  DOCUMENT_AI_LOCK_MESSAGE,
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  lockDocumentForCommentAi,
} from "@/lib/documentAiJobs";
import { getDocumentText } from "@/lib/documentMarks";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

function responseText(message: { content: Array<{ type: string; text?: string }> }) {
  return message.content
    .flatMap((block) => (block.type === "text" && block.text ? [block.text] : []))
    .join("\n")
    .trim();
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { id } = await params;
  const existing = await getCommentForUser(
    id,
    session.user.id,
    session.user.email,
    "COMMENT",
  );
  if (!existing || existing.parentId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = await request.json().catch(() => ({}));
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 4_000) {
    return NextResponse.json(
      { error: "Write a message between 1 and 4,000 characters." },
      { status: 400 },
    );
  }
  if (existing.status !== "OPEN") {
    return NextResponse.json(
      { error: "Reopen this comment before adding another message." },
      { status: 409 },
    );
  }

  const aiStartedAt = new Date();
  const admission = await prisma.$transaction(async (transaction) => {
    const documentExists = await lockDocumentForCommentAi(
      transaction,
      existing.documentId,
    );
    if (!documentExists) return { kind: "missing" as const };

    await expireStaleCommentAiJobs(transaction, existing.documentId, aiStartedAt);
    const conflictingJob = await hasActiveCommentAiJob(
      transaction,
      existing.documentId,
      { documentWideOnly: existing.scope !== "DOCUMENT", now: aiStartedAt },
    );
    if (conflictingJob) {
      return {
        kind: "locked" as const,
        documentAiLocked: await hasActiveCommentAiJob(
          transaction,
          existing.documentId,
          { documentWideOnly: true, now: aiStartedAt },
        ),
      };
    }

    await transaction.comment.update({
      where: { id },
      data: {
        aiStatus: "PENDING",
        aiStartedAt,
        aiCompletedAt: null,
      },
    });
    await transaction.comment.create({
      data: {
        documentId: existing.documentId,
        authorId: session.user.id,
        authorType: "USER",
        parentId: id,
        scope: existing.scope,
        anchorMarkId: existing.anchorMarkId,
        quotedText: existing.quotedText,
        body,
      },
    });
    return { kind: "created" as const };
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

  let completed = false;
  let telemetry: Awaited<ReturnType<typeof startAiGeneration>> | undefined;
  let trackedMessage: TrackedAnthropicMessage | undefined;
  try {
    const [thread, document, model] = await Promise.all([
      prisma.comment.findUniqueOrThrow({
        where: { id },
        include: {
          replies: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.document.findUniqueOrThrow({
        where: { id: existing.documentId },
        select: { content: true },
      }),
      getUserAiModel(session.user.id),
    ]);
    if (!checkRateLimit(`ai:${session.user.id}`, 15, 60_000)) {
      throw new Error("Rate limited — skipping AI response for this message");
    }
    telemetry = await startAiGeneration({
      feature: "COMMENT_RESPOND",
      model,
      userId: session.user.id,
      documentId: existing.documentId,
      commentId: id,
    });
    const documentText =
      document.content && typeof document.content === "object"
        ? getDocumentText(document.content as JSONContent)
        : "";
    const transcript = formatCommentConversation(thread.body, thread.replies);
    const message = await anthropic.messages.create({
      model,
      max_tokens: 2_048,
      system:
        "You are Thido, an editorial assistant continuing an existing document comment thread. " +
        "Answer the user's latest message directly and concisely. Use the document and quoted target as context. " +
        "Do not claim that you changed the document in this conversational reply.",
      messages: [
        {
          role: "user",
          content:
            `DOCUMENT:\n${documentText || "(empty)"}\n\n` +
            `COMMENT TARGET:\n${thread.quotedText || "Entire document"}\n\n` +
            `THREAD:\n${transcript}`,
        },
      ],
    });
    trackedMessage = message;
    const aiBody = responseText(message);
    if (!aiBody) throw new Error("AI returned an empty comment reply");

    await prisma.$transaction([
      prisma.comment.create({
        data: {
          documentId: existing.documentId,
          authorType: "AI",
          parentId: id,
          scope: existing.scope,
          anchorMarkId: existing.anchorMarkId,
          quotedText: existing.quotedText,
          body: aiBody,
        },
      }),
      prisma.comment.update({
        where: { id },
        data: {
          aiStatus: "SUCCEEDED",
          aiCompletedAt: new Date(),
        },
      }),
    ]);
    await telemetry.succeed(message);
    completed = true;
  } catch (error) {
    await telemetry?.fail(error, trackedMessage);
    await prisma.comment.updateMany({
      where: { id, aiStatus: "PENDING" },
      data: { aiStatus: "FAILED", aiCompletedAt: new Date() },
    });
    console.error("AI comment follow-up failed", error);
  }

  const comment = await prisma.comment.findUniqueOrThrow({
    where: { id },
    include: {
      author: { select: { name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
      suggestion: true,
    },
  });
  return NextResponse.json(
    { comment, aiProcessing: completed ? "completed" : "failed" },
    { status: 201 },
  );
}
