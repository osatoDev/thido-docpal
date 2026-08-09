import { z } from "zod";

export const FEEDBACK_RESPONSE_WINDOW_MS = 8 * 60 * 60 * 1000;

export type FounderInboxView = "all" | "due";

export function parseFounderInboxView(
  value: string | string[] | undefined,
): FounderInboxView {
  return value === "due" ? "due" : "all";
}

export const feedbackMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a message before sending.")
    .max(4_000, "Keep the message under 4,000 characters."),
  category: z.enum(["PROBLEM", "IDEA", "QUESTION", "OTHER"]),
  currentPath: z.string().max(500).optional(),
});

export const founderReplySchema = z.object({
  threadId: z.string().cuid(),
  body: z
    .string()
    .trim()
    .min(1, "Write a reply before sending.")
    .max(4_000, "Keep the reply under 4,000 characters."),
});

export function sanitizeFeedbackPath(value: string | undefined) {
  if (!value?.startsWith("/")) return null;

  try {
    const pathname = new URL(value, "https://thido.invalid").pathname;
    if (pathname.startsWith("/share/")) return "/share/[token]";
    if (pathname.startsWith("/reset-password")) return "/reset-password";
    if (pathname.startsWith("/verify-email")) return "/verify-email";
    return pathname.slice(0, 500);
  } catch {
    return null;
  }
}

export function founderFeedbackRecipients() {
  const configured = process.env.FEEDBACK_NOTIFICATION_EMAILS?.trim();
  return Array.from(
    new Set(
      (configured || process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}
