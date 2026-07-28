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
  canManage,
}: {
  suggestion: SuggestionWithStatus;
  onResolved: (updated: SuggestionWithStatus, documentContent?: unknown) => void;
  canManage: boolean;
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
    <div className="mt-2 border-l-2 border-[var(--warm)] bg-[color-mix(in_srgb,var(--warm)_7%,var(--surface))] px-3 py-2 text-xs">
      <p className="mb-2 font-medium text-[var(--warm)]">
        {STATUS_LABEL[suggestion.status]}
      </p>
      <p className="text-[var(--muted)] line-through">{suggestion.originalText}</p>
      <p>{suggestion.proposedText}</p>
      {error && <p className="mt-1 text-[var(--danger)]">{error}</p>}
      {suggestion.status === "PENDING" && canManage && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => respond("accept")}
            className="primary-button rounded-sm px-2 py-1 disabled:opacity-50"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => respond("reject")}
            className="secondary-button rounded-sm px-2 py-1 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
