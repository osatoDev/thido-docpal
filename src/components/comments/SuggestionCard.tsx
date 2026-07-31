"use client";

import { useState } from "react";
import { reportClientError } from "@/lib/rollbar/client";
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
  const isDocumentWide = suggestion.scope === "DOCUMENT";

  async function respond(action: "accept" | "reject") {
    setBusy(true);
    setError(null);
    let status: number | undefined;
    try {
      const res = await fetch(`/api/suggestions/${suggestion.id}/${action}`, {
        method: "POST",
      });
      status = res.status;
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Could not update the suggestion",
        );
      }
      onResolved(data.suggestion, data.document?.content);
    } catch (err) {
      if (status === undefined || status >= 500) {
        reportClientError(err, {
          source: "client-action",
          action: `suggestion-${action}`,
          status,
        });
      }
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
      {isDocumentWide ? (
        <details>
          <summary className="font-medium text-[var(--foreground)]">
            Review the full-document revision
          </summary>
          <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-sm bg-[var(--surface)] p-3 leading-5 text-[var(--muted)]">
            {suggestion.proposedText}
          </div>
        </details>
      ) : (
        <>
          <p className="text-[var(--muted)] line-through">
            {suggestion.originalText}
          </p>
          <p>{suggestion.proposedText}</p>
        </>
      )}
      {error && (
        <p className="mt-1 text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
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
