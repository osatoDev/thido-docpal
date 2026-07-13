"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INITIAL_QUESTIONS } from "@/lib/wizardQuestions";

export function InitialPromptForm() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const createRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!createRes.ok) throw new Error("Could not create document");
      const { documentId } = await createRes.json();

      const answersPayload = INITIAL_QUESTIONS.map((q) => ({
        order: q.order,
        question: q.question,
        answer: answers[q.key]?.trim() ?? "",
      }));

      const answersRes = await fetch(
        `/api/documents/${documentId}/prompt-answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: answersPayload }),
        },
      );
      if (!answersRes.ok) throw new Error("Could not save your answers");

      router.push(`/documents/${documentId}/wizard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="app-panel flex flex-col gap-6 rounded-2xl p-5 sm:p-7">
      {INITIAL_QUESTIONS.map((q) => (
        <label key={q.key} className="flex flex-col gap-1">
          <span className="text-sm font-medium">{q.label}</span>
          <span className="text-sm text-[var(--muted)]">{q.question}</span>
          <textarea
            required
            rows={2}
            value={answers[q.key] ?? ""}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
            }
            className="app-input mt-1 resize-none rounded-xl p-3 text-sm outline-none"
          />
        </label>
      ))}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="primary-button self-start rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {submitting ? "Starting…" : "Continue"}
      </button>
    </form>
  );
}
