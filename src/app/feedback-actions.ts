"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import {
  FEEDBACK_RESPONSE_WINDOW_MS,
  feedbackMessageSchema,
  founderFeedbackRecipients,
  founderReplySchema,
  sanitizeFeedbackPath,
} from "@/lib/feedback";
import type { FeedbackActionState } from "@/lib/feedback-action-state";
import {
  sendFounderFeedbackNotification,
  sendFounderReplyEmail,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { reportServerError } from "@/lib/rollbar/server";

export async function sendUserFeedbackMessage(
  _state: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sign in again to send this message." };
  }

  if (
    !checkRateLimit(
      `founder-feedback:${session.user.id}`,
      12,
      10 * 60 * 1000,
    )
  ) {
    return {
      status: "error",
      message: "You have sent several messages. Wait a few minutes and try again.",
    };
  }

  const parsed = feedbackMessageSchema.safeParse({
    body: formData.get("body"),
    category: formData.get("category"),
    currentPath: formData.get("currentPath") || undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Check the message and try again.",
    };
  }

  const now = new Date();
  const currentPath = sanitizeFeedbackPath(parsed.data.currentPath);
  let result;
  try {
    result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.feedbackThread.findUnique({
        where: { userId: session.user.id },
        select: { responseDueAt: true },
      });
      const responseDueAt =
        existing?.responseDueAt ??
        new Date(now.getTime() + FEEDBACK_RESPONSE_WINDOW_MS);
      const thread = await transaction.feedbackThread.upsert({
        where: { userId: session.user.id },
        update: {
          category: parsed.data.category,
          status: "OPEN",
          currentPath,
          responseDueAt,
          lastUserMessageAt: now,
        },
        create: {
          userId: session.user.id,
          category: parsed.data.category,
          currentPath,
          responseDueAt,
          lastUserMessageAt: now,
        },
        select: { id: true },
      });
      const message = await transaction.feedbackMessage.create({
        data: {
          threadId: thread.id,
          authorId: session.user.id,
          authorType: "USER",
          body: parsed.data.body,
        },
        select: { id: true },
      });
      return { threadId: thread.id, messageId: message.id };
    });
  } catch (error) {
    console.error("Unable to save founder feedback", {
      userId: session.user.id,
    });
    await reportServerError(error, {
      source: "founder-feedback",
      operation: "save-user-message",
    });
    return {
      status: "error",
      message: "We couldn't save that message. Please try again.",
    };
  }

  try {
    await sendFounderFeedbackNotification({
      recipients: founderFeedbackRecipients(),
      threadId: result.threadId,
      messageId: result.messageId,
      senderName: session.user.name?.trim() || "A Thido user",
      senderEmail: session.user.email ?? "No email available",
      category: parsed.data.category,
      body: parsed.data.body,
      currentPath,
    });
    await prisma.feedbackThread.update({
      where: { id: result.threadId },
      data: { founderNotifiedAt: new Date() },
    });
  } catch (error) {
    console.error("Unable to notify founders about feedback", {
      threadId: result.threadId,
    });
    await reportServerError(error, {
      source: "founder-feedback",
      operation: "notify-founders",
    });
  }

  revalidatePath("/feedback");
  revalidatePath("/admin");
  revalidatePath("/admin/feedback");
  return {
    status: "success",
    message: "Message sent to the founding team.",
    submissionId: result.messageId,
  };
}

export async function sendFounderFeedbackReply(
  _state: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const session = await requireAdmin();
  const parsed = founderReplySchema.safeParse({
    threadId: formData.get("threadId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the reply and try again.",
    };
  }

  const now = new Date();
  let result;
  try {
    result = await prisma.$transaction(async (transaction) => {
      const thread = await transaction.feedbackThread.findUnique({
        where: { id: parsed.data.threadId },
        select: {
          id: true,
          firstRespondedAt: true,
          user: { select: { email: true } },
        },
      });
      if (!thread) return null;

      const message = await transaction.feedbackMessage.create({
        data: {
          threadId: thread.id,
          authorId: session.user.id,
          authorType: "FOUNDER",
          body: parsed.data.body,
        },
        select: { id: true },
      });
      await transaction.feedbackThread.update({
        where: { id: thread.id },
        data: {
          status: "OPEN",
          responseDueAt: null,
          firstRespondedAt: thread.firstRespondedAt ?? now,
          lastFounderMessageAt: now,
        },
      });
      return {
        messageId: message.id,
        userEmail: thread.user.email,
      };
    });
  } catch (error) {
    console.error("Unable to save founder reply", {
      threadId: parsed.data.threadId,
    });
    await reportServerError(error, {
      source: "founder-feedback",
      operation: "save-founder-reply",
    });
    return {
      status: "error",
      message: "We couldn't save that reply. Please try again.",
    };
  }

  if (!result) {
    return { status: "error", message: "This conversation no longer exists." };
  }

  if (result.userEmail) {
    try {
      await sendFounderReplyEmail({
        email: result.userEmail,
        messageId: result.messageId,
        body: parsed.data.body,
      });
    } catch (error) {
      console.error("Unable to email a founder reply", {
        threadId: parsed.data.threadId,
      });
      await reportServerError(error, {
        source: "founder-feedback",
        operation: "notify-user",
      });
    }
  }

  revalidatePath("/feedback");
  revalidatePath("/admin");
  revalidatePath("/admin/feedback");
  revalidatePath(`/admin/feedback/${parsed.data.threadId}`);
  return {
    status: "success",
    message: "Reply sent.",
    submissionId: result.messageId,
  };
}
