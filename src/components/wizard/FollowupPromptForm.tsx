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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
        <p className="text-sm text-gray-600">
          Writing your document{charsGenerated > 0 ? ` (${charsGenerated} characters so far)…` : "…"}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {followups.map((f) => (
        <label key={f.id} className="flex flex-col gap-1">
          <span className="text-sm font-medium">{f.question}</span>
          <textarea
            required
            rows={2}
            value={answers[f.id] ?? ""}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))
            }
            className="mt-1 resize-none rounded-md border p-2 text-sm outline-none focus:ring-1 focus:ring-black"
          />
        </label>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Generate document
      </button>
    </form>
  );
}
