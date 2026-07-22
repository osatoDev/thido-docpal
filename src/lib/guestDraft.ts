import { z } from "zod";

import { INITIAL_QUESTIONS } from "@/lib/wizardQuestions";

export const GUEST_DRAFT_STORAGE_KEY = "thido:guest-draft:v1";
export const GUEST_DRAFT_VERSION = 1 as const;
export const GUEST_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const storedAnswerSchema = z.string().max(4_000);

const storedGuestDraftSchema = z
  .object({
    version: z.literal(GUEST_DRAFT_VERSION),
    draftId: z.string().uuid(),
    savedAt: z.string().datetime(),
    answers: z.object({
      purpose: storedAnswerSchema,
      audience: storedAnswerSchema,
      tone: storedAnswerSchema,
      keyPoints: storedAnswerSchema,
      format: storedAnswerSchema,
    }),
  })
  .strict();

export const guestDraftSchema = storedGuestDraftSchema
  .refine(
    (draft) => Object.values(draft.answers).every((answer) => answer.trim()),
    { message: "Every outline answer is required." },
  )
  .refine(
    (draft) =>
      Object.values(draft.answers).reduce(
        (total, answer) => total + answer.length,
        0,
      ) <= 12_000,
    { message: "The outline is too large." },
  );

export type GuestDraft = z.infer<typeof guestDraftSchema>;
export type StoredGuestDraft = z.infer<typeof storedGuestDraftSchema>;
export type GuestDraftAnswers = StoredGuestDraft["answers"];

function isCurrentDraft(draft: StoredGuestDraft) {
  const savedAt = Date.parse(draft.savedAt);
  return (
    Number.isFinite(savedAt) &&
    Date.now() - savedAt <= GUEST_DRAFT_MAX_AGE_MS &&
    savedAt - Date.now() <= 60_000
  );
}

export function parseGuestDraft(value: unknown): GuestDraft | null {
  const parsed = guestDraftSchema.safeParse(value);
  if (!parsed.success) return null;

  return isCurrentDraft(parsed.data) ? parsed.data : null;
}

export function parseStoredGuestDraft(
  raw: string | null,
): StoredGuestDraft | null {
  if (!raw) return null;

  try {
    const parsed = storedGuestDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success && isCurrentDraft(parsed.data) ? parsed.data : null;
  } catch {
    return null;
  }
}

export function toInitialPromptAnswers(draft: GuestDraft) {
  return INITIAL_QUESTIONS.map((question) => ({
    order: question.order,
    question: question.question,
    answer: draft.answers[question.key].trim(),
  }));
}
