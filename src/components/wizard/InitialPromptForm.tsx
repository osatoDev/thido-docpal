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
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 border-t border-[var(--border-strong)] pt-8">
      {INITIAL_QUESTIONS.map((q) => (
        <label key={q.key} className="grid gap-2 border-b border-[var(--border)] pb-8 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
          <span>
          <span className="text-sm font-medium">{q.label}</span>
          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{q.question}</span>
          </span>
          <textarea
            required
            rows={2}
            value={answers[q.key] ?? ""}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
            }
            className="app-input min-h-24 resize-y rounded-md p-3 text-sm leading-6 outline-none"
          />
        </label>
      ))}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="primary-button self-start rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Starting…" : "Continue"}
      </button>
    </form>
  );
}
