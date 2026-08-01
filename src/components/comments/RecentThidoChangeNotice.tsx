"use client";

import type { SuggestionWithStatus } from "@/lib/types";

export function RecentThidoChangeNotice({
  suggestion,
  onDismiss,
}: {
  suggestion: SuggestionWithStatus;
  onDismiss: () => void;
}) {
  return (
    <section
      className="mx-auto w-full max-w-6xl rounded-sm border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
      aria-label="Recent edit by Thido"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className="text-xs font-semibold text-[var(--accent-strong)]"
            role="status"
          >
            Recently changed by Thido
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Changed to</p>
          <div className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
            {suggestion.proposedText}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-sm px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
          aria-label="Dismiss recent Thido change"
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}
