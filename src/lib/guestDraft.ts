import { z } from "zod";

import { INITIAL_QUESTIONS } from "@/lib/wizardQuestions";

export const GUEST_DRAFT_STORAGE_KEY = "thido:guest-draft:v1";
export const GUEST_DRAFT_VERSION = 1 as const;
export const GUEST_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const storedAnswerSchema = z.string().max(4_000);

const guidedGuestDraftSchema = z
  .object({
    version: z.literal(GUEST_DRAFT_VERSION),
    draftId: z.string().uuid(),
    savedAt: z.string().datetime(),
    mode: z.literal("GUIDED").default("GUIDED"),
    answers: z.object({
      purpose: storedAnswerSchema,
      audience: storedAnswerSchema,
      tone: storedAnswerSchema,
      keyPoints: storedAnswerSchema,
      format: storedAnswerSchema,
    }),
  })
  .strict();

const freeformGuestDraftSchema = z
  .object({
    version: z.literal(GUEST_DRAFT_VERSION),
    draftId: z.string().uuid(),
    savedAt: z.string().datetime(),
    mode: z.literal("FREEFORM"),
    prompt: z.string().max(12_000),
  })
  .strict();

const storedGuestDraftSchema = z.union([
  guidedGuestDraftSchema,
  freeformGuestDraftSchema,
]);

export const guestDraftSchema = storedGuestDraftSchema.superRefine(
  (draft, context) => {
    if (draft.mode === "FREEFORM") {
      if (!draft.prompt.trim()) {
        context.addIssue({
          code: "custom",
          message: "A freeform prompt is required.",
          path: ["prompt"],
        });
      }
      return;
    }

    if (!Object.values(draft.answers).some((answer) => answer.trim())) {
      context.addIssue({
        code: "custom",
        message: "Add at least one detail to guide the document.",
        path: ["answers"],
      });
    }

    const totalLength = Object.values(draft.answers).reduce(
      (total, answer) => total + answer.length,
      0,
    );
    if (totalLength > 12_000) {
      context.addIssue({
        code: "custom",
        message: "The outline is too large.",
        path: ["answers"],
      });
    }
  },
);

export type GuestDraft = z.infer<typeof guestDraftSchema>;
export type StoredGuestDraft = z.infer<typeof storedGuestDraftSchema>;
export type GuestDraftMode = StoredGuestDraft["mode"];
export type GuestDraftAnswers = Extract<
  StoredGuestDraft,
  { mode: "GUIDED" }
>["answers"];

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
  if (draft.mode === "FREEFORM") {
    return [
      {
        order: 1,
        question: "What would you like Thido to draft?",
        answer: draft.prompt.trim(),
      },
    ];
  }

  return INITIAL_QUESTIONS.map((question) => ({
    order: question.order,
    question: question.question,
    answer: draft.answers[question.key].trim(),
  }));
}
