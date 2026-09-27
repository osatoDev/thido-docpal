"use client";

import { useState } from "react";

export type HistoryRetention = { canManage: boolean; keepAll: boolean; deleteAfter: string | null };

export function HistoryRetentionControl({ documentId, initial }: { documentId: string; initial: HistoryRetention }) {
  const [keepAll, setKeepAll] = useState(initial.keepAll);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function preserveHistory() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/revisions/retention`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keepAll: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not keep your history. Please try again.");
      setKeepAll(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not keep your history.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-xs" aria-label="Version history retention">
      <p role="status" className="leading-relaxed text-[var(--muted)]">
        {keepAll
          ? "All versions are kept for this document. Automatic history cleanup is off."
          : initial.deleteAfter
            ? `Older versions covered by your email notice may be removed on or after ${new Date(initial.deleteAfter).toLocaleDateString()}. Your current document and at least the newest 100 versions will remain.`
            : "We keep at least your newest 100 versions. Before removing older versions, we email the owner and allow 14 days to choose to keep them."}
      </p>
      {!keepAll && initial.canManage ? (
        <div className="mt-2">
          <button type="button" onClick={() => void preserveHistory()} disabled={saving} className="secondary-button rounded-md px-3 py-2 font-medium disabled:opacity-50">
            {saving ? "Keeping your history…" : "Keep all versions"}
          </button>
          <p className="mt-2 text-[var(--muted)]">This keeps remaining and future versions. Versions already removed cannot be recovered.</p>
        </div>
      ) : !keepAll ? <p className="mt-2 text-[var(--muted)]">Only the document owner can change this choice.</p> : null}
      {error ? <p role="alert" className="mt-2 text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
