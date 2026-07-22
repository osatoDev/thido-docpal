"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  GUEST_DRAFT_STORAGE_KEY,
  GUEST_DRAFT_VERSION,
  guestDraftSchema,
  type GuestDraft,
  type GuestDraftAnswers,
  type StoredGuestDraft,
} from "@/lib/guestDraft";
import { INITIAL_QUESTIONS } from "@/lib/wizardQuestions";

const EMPTY_ANSWERS: GuestDraftAnswers = {
  purpose: "",
  audience: "",
  tone: "",
  keyPoints: "",
  format: "",
};

function createDraft(
  draftId: string,
  answers: GuestDraftAnswers,
): GuestDraft | null {
  const parsed = guestDraftSchema.safeParse({
    version: GUEST_DRAFT_VERSION,
    draftId,
    savedAt: new Date().toISOString(),
    answers,
  });

  return parsed.success ? parsed.data : null;
}

export function InitialPromptEditor({
  initialDraft,
  isAuthenticated,
  resumeGuestDraft,
}: {
  initialDraft: StoredGuestDraft | null;
  isAuthenticated: boolean;
  resumeGuestDraft: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<GuestDraftAnswers>(
    initialDraft?.answers ?? EMPTY_ANSWERS,
  );
  const [draftId] = useState(
    () => initialDraft?.draftId ?? window.crypto.randomUUID(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resumableDraft = createDraft(draftId, answers);

  useEffect(() => {
    window.sessionStorage.setItem(
      GUEST_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: GUEST_DRAFT_VERSION,
        draftId,
        savedAt: new Date().toISOString(),
        answers,
      }),
    );
  }, [answers, draftId]);

  async function claimDraft(draft: GuestDraft) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/documents/claim-guest-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || typeof result.documentId !== "string") {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Could not save your outline.",
        );
      }

      window.sessionStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
      router.replace(`/documents/${result.documentId}/wizard`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong.",
      );
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const draft = createDraft(draftId, answers);
    if (!draft) {
      setError("Complete every question before continuing.");
      return;
    }

    window.sessionStorage.setItem(
      GUEST_DRAFT_STORAGE_KEY,
      JSON.stringify(draft),
    );

    if (!isAuthenticated) {
      router.push(
        "/login?notice=draft-ready&callbackUrl=%2Fdocuments%2Fnew%3Fresume%3D1",
      );
      return;
    }

    await claimDraft(draft);
  }

  if (submitting) {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3 border-t border-[var(--border-strong)] py-10"
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent-strong)]" />
        <p className="text-sm text-[var(--muted)]">Saving your outline…</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-8 border-t border-[var(--border-strong)] pt-8"
    >
      {resumeGuestDraft && isAuthenticated && resumableDraft && (
        <div className="border-l-2 border-[var(--accent-strong)] pl-4">
          <p className="text-sm font-medium">Your outline is ready.</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Review your answers, then continue to save them to your account and
            prepare the follow-up questions.
          </p>
        </div>
      )}

      {resumeGuestDraft && !resumableDraft && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          We could not find a complete temporary outline in this browser. Your
          available answers are shown below.
        </p>
      )}

      {INITIAL_QUESTIONS.map((question) => (
        <label
          key={question.key}
          className="grid gap-2 border-b border-[var(--border)] pb-8 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8"
        >
          <span>
            <span className="text-sm font-medium">{question.label}</span>
            <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
              {question.question}
            </span>
          </span>
          <textarea
            required
            rows={2}
            maxLength={4_000}
            value={answers[question.key]}
            onChange={(event) =>
              setAnswers((previous) => ({
                ...previous,
                [question.key]: event.target.value,
              }))
            }
            className="app-input min-h-24 resize-y rounded-md p-3 text-sm leading-6 outline-none"
          />
        </label>
      ))}

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-col items-start gap-2">
        <button
          type="submit"
          className="primary-button rounded-md px-4 py-2.5 text-sm font-medium"
        >
          Generate
        </button>
      </div>
    </form>
  );
}
