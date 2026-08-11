"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Followup = { id: string; question: string; answer: string };

export function FollowupPromptForm({
  documentId,
  followups,
}: {
  documentId: string;
  followups: Followup[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(followups.map((f) => [f.id, f.answer])),
  );
  const [phase, setPhase] = useState<"answering" | "generating" | "error">(
    "answering",
  );
  const [error, setError] = useState<string | null>(null);
  const [charsGenerated, setCharsGenerated] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("generating");
    setError(null);

    try {
      const updateRes = await fetch(
        `/api/documents/${documentId}/prompt-answers/followups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: followups.map((f) => ({
              id: f.id,
              answer: answers[f.id]?.trim() ?? "",
            })),
          }),
        },
      );
      if (!updateRes.ok) throw new Error("Could not save your answers");

      const generateRes = await fetch(`/api/documents/${documentId}/generate`, {
        method: "POST",
      });
      if (!generateRes.ok || !generateRes.body) {
        throw new Error("Could not generate the document");
      }

      const reader = generateRes.body.getReader();
      let total = 0;
      // Drain the stream so we know when generation (and server-side
      // persistence) has finished before navigating to the editor.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        setCharsGenerated(total);
      }

      router.push(`/documents/${documentId}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  }

  if (phase === "generating") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent-strong)]" />
        <p className="text-sm text-[var(--muted)]">
          Writing your document{charsGenerated > 0 ? ` (${charsGenerated} characters so far)…` : "…"}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 border-t border-[var(--border-strong)] pt-8">
      <div className="border-l-2 border-[var(--accent-strong)] pl-4">
        <p className="text-sm font-medium">Answer only what you want.</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          Leave any question blank and Thido will make a reasonable assumption.
        </p>
      </div>
      {followups.map((f) => (
        <label key={f.id} className="grid gap-3 border-b border-[var(--border)] pb-8 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
          <span>
            <span className="block text-sm font-medium leading-5">{f.question}</span>
            <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
              Optional. Leave blank for Thido
            </span>
          </span>
          <textarea
            rows={2}
            value={answers[f.id] ?? ""}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))
            }
            className="app-input min-h-24 resize-y rounded-md p-3 text-sm leading-6 outline-none"
          />
        </label>
      ))}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        className="primary-button self-start rounded-md px-4 py-2.5 text-sm font-medium"
      >
        Generate document
      </button>
    </form>
  );
}
