"use client";

import { useState } from "react";
import type { SuggestionWithStatus } from "@/lib/types";

const STATUS_LABEL: Record<SuggestionWithStatus["status"], string> = {
  PENDING: "Pending suggestion",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  AUTO_APPLIED: "Auto-applied",
};

export function SuggestionCard({
  suggestion,
  onResolved,
}: {
  suggestion: SuggestionWithStatus;
  onResolved: (updated: SuggestionWithStatus, documentContent?: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/suggestions/${suggestion.id}/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Could not update the suggestion");
      const data = await res.json();
      onResolved(data.suggestion, data.document?.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
      <p className="mb-1 font-medium text-amber-800">
        {STATUS_LABEL[suggestion.status]}
      </p>
      <p className="text-gray-500 line-through">{suggestion.originalText}</p>
      <p className="text-gray-800">{suggestion.proposedText}</p>
      {error && <p className="mt-1 text-red-600">{error}</p>}
      {suggestion.status === "PENDING" && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => respond("accept")}
            className="rounded bg-black px-2 py-1 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => respond("reject")}
            className="rounded border px-2 py-1 hover:bg-gray-100 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
