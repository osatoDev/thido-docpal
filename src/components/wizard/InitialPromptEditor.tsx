"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Document starters are hidden for now (see the commented block below), so this
// import is disabled to keep lint clean. Restore both together.
// import {
//   DOCUMENT_STARTERS,
//   getDocumentStarter,
// } from "@/lib/documentStarters";
import {
  GUEST_DRAFT_STORAGE_KEY,
  GUEST_DRAFT_VERSION,
  guestDraftSchema,
  type GuestDraft,
  type GuestDraftAnswers,
  type GuestDraftMode,
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
  mode: GuestDraftMode,
  answers: GuestDraftAnswers,
  freeformPrompt: string,
): GuestDraft | null {
  const parsed = guestDraftSchema.safeParse({
    version: GUEST_DRAFT_VERSION,
    draftId,
    savedAt: new Date().toISOString(),
    ...(mode === "FREEFORM"
      ? { mode, prompt: freeformPrompt }
      : { mode, answers }),
  });

  return parsed.success ? parsed.data : null;
}

export function InitialPromptEditor({
  initialDraft,
  isAuthenticated,
  persistDraft,
  resumeGuestDraft,
}: {
  initialDraft: StoredGuestDraft | null;
  isAuthenticated: boolean;
  persistDraft: boolean;
  resumeGuestDraft: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<GuestDraftMode>(
    initialDraft?.mode ?? "GUIDED",
  );
  const [answers, setAnswers] = useState<GuestDraftAnswers>(
    initialDraft?.mode === "GUIDED" ? initialDraft.answers : EMPTY_ANSWERS,
  );
  const [freeformPrompt, setFreeformPrompt] = useState(
    initialDraft?.mode === "FREEFORM" ? initialDraft.prompt : "",
  );
  const [draftId] = useState(
    () => initialDraft?.draftId ?? globalThis.crypto.randomUUID(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resumableDraft = createDraft(
    draftId,
    mode,
    answers,
    freeformPrompt,
  );

  useEffect(() => {
    if (!persistDraft) return;

    const draft = {
      version: GUEST_DRAFT_VERSION,
      draftId,
      savedAt: new Date().toISOString(),
      ...(mode === "FREEFORM"
        ? { mode, prompt: freeformPrompt }
        : { mode, answers }),
    };

    window.sessionStorage.setItem(
      GUEST_DRAFT_STORAGE_KEY,
      JSON.stringify(draft),
    );
  }, [answers, draftId, freeformPrompt, mode, persistDraft]);

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

      if (draft.mode === "FREEFORM") {
        const generateResponse = await fetch(
          `/api/documents/${result.documentId}/generate`,
          { method: "POST" },
        );
        if (!generateResponse.ok) {
          const generateResult = await generateResponse
            .json()
            .catch(() => ({}));
          throw new Error(
            typeof generateResult?.error?.message === "string"
              ? generateResult.error.message
              : "Could not generate your document.",
          );
        }
        if (!generateResponse.body) {
          throw new Error("Could not generate your document.");
        }

        const reader = generateResponse.body.getReader();
        while (!(await reader.read()).done) {
          // Drain the stream before navigating so persistence can finish.
        }

        window.sessionStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
        router.replace(`/documents/${result.documentId}/edit`);
        return;
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

    const draft = createDraft(draftId, mode, answers, freeformPrompt);
    if (!draft) {
      setError(
        mode === "FREEFORM"
          ? "Write a prompt before generating your document."
          : "Add at least one detail so Thido knows what to draft.",
      );
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

  // Paired with the hidden "Document starters" block below; restore together.
  // function applyStarter(starterId: string) {
  //   const starter = getDocumentStarter(starterId);
  //   if (!starter) return;
  //
  //   setAnswers({ ...starter.answers });
  //   setError(null);
  // }

  if (submitting) {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3 border-t border-[var(--border-strong)] py-10"
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent-strong)]" />
        <p className="text-sm text-[var(--muted)]">
          {mode === "FREEFORM"
            ? "Writing your document…"
            : "Saving your outline…"}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {resumeGuestDraft && isAuthenticated && resumableDraft && (
        <div className="mb-8 border-l-2 border-[var(--accent-strong)] pl-4">
          <p className="text-sm font-medium">
            {mode === "FREEFORM"
              ? "Your prompt is ready."
              : "Your outline is ready."}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {mode === "FREEFORM"
              ? "Review it, then generate the document and save it to your account."
              : "Review your answers, then continue to save them to your account and prepare the follow-up questions."}
          </p>
        </div>
      )}

      {resumeGuestDraft &&
        isAuthenticated &&
        initialDraft &&
        !resumableDraft && (
          <div className="mb-8 border-l-2 border-[var(--accent-strong)] pl-4">
            <p className="text-sm font-medium">Your saved work is here.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Continue where you left off, then generate when the brief is
              ready.
            </p>
          </div>
      )}

      <fieldset className="border-y border-[var(--border-strong)] py-6">
        <legend className="text-sm font-medium">
          How would you like to begin?
        </legend>
        <div className="mt-4 inline-flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-1">
          <button
            type="button"
            aria-pressed={mode === "GUIDED"}
            onClick={() => {
              setMode("GUIDED");
              setError(null);
            }}
            className={`rounded px-3 py-2 text-sm font-medium ${
              mode === "GUIDED"
                ? "bg-[var(--foreground)] text-[var(--surface)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Guided questions
          </button>
          <button
            type="button"
            aria-pressed={mode === "FREEFORM"}
            onClick={() => {
              setMode("FREEFORM");
              setError(null);
            }}
            className={`rounded px-3 py-2 text-sm font-medium ${
              mode === "FREEFORM"
                ? "bg-[var(--foreground)] text-[var(--surface)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Freeform prompt
          </button>
        </div>
        <p className="mt-3 max-w-xl text-xs leading-5 text-[var(--muted)]">
          {mode === "GUIDED"
            ? "Build your brief step by step, then add detail through tailored follow-up questions."
            : "Describe the document in your own words and generate it directly."}
        </p>
      </fieldset>

      {/*
        Document starters hidden while the initial marketing targets novel
        writers only; the current starters are all business documents. Restore
        this block (and `applyStarter` above) once the audience broadens.
      */}
      {/* {mode === "GUIDED" && (
        <fieldset className="border-b border-[var(--border-strong)] py-6">
          <legend className="sr-only">Document starters</legend>
          <div className="grid gap-4 sm:grid-cols-[16rem_minmax(0,24rem)] sm:items-center sm:gap-10">
            <div>
              <p className="text-sm font-medium">Not sure where to begin?</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Choosing a starter replaces the current answers.
              </p>
            </div>
            <label className="grid gap-1.5">
              <span className="sr-only">Choose a document starter</span>
              <select
                value=""
                onChange={(event) => applyStarter(event.target.value)}
                className="app-input h-10 w-full rounded-md px-3 text-sm outline-none"
              >
                <option value="" disabled>
                  Choose a document starter…
                </option>
                {DOCUMENT_STARTERS.map((starter) => (
                  <option key={starter.id} value={starter.id}>
                    {starter.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      )} */}

      {mode === "GUIDED" && (
        <div className="border-b border-[var(--border-strong)] py-6">
          <p className="text-sm font-medium">Share only what you know.</p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--muted)]">
            Every question is optional. Leave any answer blank and Thido will
            make a reasonable choice from the rest of your brief.
          </p>
        </div>
      )}

      {mode === "GUIDED" &&
        INITIAL_QUESTIONS.map((question) => (
          <label
            key={question.key}
            className="grid gap-2 border-b border-[var(--border)] py-8 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8"
          >
            <span>
              <span className="text-sm font-medium">{question.label}</span>{" "}
              <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                Optional
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                {question.question}
              </span>
            </span>
            <textarea
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

      {mode === "FREEFORM" && (
        <label className="grid gap-3 border-b border-[var(--border)] py-8 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
          <span>
            <span className="text-sm font-medium">Your prompt</span>
            <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
              Include the goal, audience, context, must-have details, tone, and
              desired format.
            </span>
          </span>
          <textarea
            required
            rows={9}
            maxLength={12_000}
            value={freeformPrompt}
            onChange={(event) => setFreeformPrompt(event.target.value)}
            placeholder="For example: Write a concise proposal for…"
            className="app-input min-h-64 resize-y rounded-md p-3 text-sm leading-6 outline-none"
          />
        </label>
      )}

      {error && (
        <p role="alert" className="mt-6 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col items-start gap-3">
        <button
          type="submit"
          className="primary-button rounded-md px-4 py-2.5 text-sm font-medium"
        >
          Generate
        </button>
        {!isAuthenticated && (
          <p className="max-w-md text-xs leading-5 text-[var(--muted)]">
            Start without an account. We&apos;ll ask you to sign in when you
            generate your draft.
          </p>
        )}
      </div>
    </form>
  );
}
