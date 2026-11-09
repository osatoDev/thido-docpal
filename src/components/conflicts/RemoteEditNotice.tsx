"use client";

import { useState } from "react";

/** Shown when the plan was saved in another browser or tab; editing waits for a reload. */
export function RemoteEditNotice({ onReload }: { onReload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onReload();
    } catch {
      setError("Couldn't load the latest version. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="print-hidden flex shrink-0 flex-wrap items-center justify-between gap-3 border border-[var(--warm)] bg-[var(--surface)] px-4 py-3 text-sm">
      <div role="alert">
        <p className="font-semibold">Your plan was edited in another window.</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Editing is paused here so the two don&rsquo;t overwrite each other. Reload to get the latest version and keep going.
        </p>
        {error ? <p className="mt-1 text-xs text-[var(--danger)]">{error}</p> : null}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void reload()}
        className="primary-button rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50"
      >
        {busy ? "Reloading…" : "Reload"}
      </button>
    </div>
  );
}
