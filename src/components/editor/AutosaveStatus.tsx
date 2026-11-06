"use client";

import { useEffect, useState } from "react";

export type SaveState = "idle" | "waiting" | "saving" | "saved" | "error";

type Props = {
  delayMs: number;
  state: SaveState;
  deadline: number | null;
  conflicted: boolean;
  onSaveNow: () => void;
};

export function AutosaveStatus({ delayMs, state, deadline, conflicted, onSaveNow }: Props) {
  const [now, setNow] = useState(() => Date.now());

  // Keep countdown ticks out of the document editor's render cycle.
  useEffect(() => {
    if (state !== "waiting" || deadline === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [state, deadline]);

  const remaining = Math.max(0, Math.min(delayMs, (deadline ?? now) - now));
  const seconds = Math.ceil(remaining / 1000);
  const waiting = state === "waiting" && !conflicted;
  const saving = state === "saving" && !conflicted;
  const label = conflicted
    ? "Unsaved changes · resolve conflict"
    : waiting
      ? seconds > 0 ? `Autosaving in ${seconds}s` : "Waiting to save…"
      : saving
        ? "Saving…"
        : state === "error"
          ? "Changes not saved"
          : state === "saved" ? "Saved" : "All changes save automatically";

  return (
    <div className="min-w-0 text-[11px]" data-testid="autosave-status">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span role="status" aria-live="polite" aria-atomic="true" className={state === "error" || conflicted ? "text-[var(--danger)]" : "text-[var(--muted)]"}>
          {saving ? <span aria-hidden="true" className="mr-1.5 inline-block size-2 rounded-full bg-current motion-safe:animate-pulse" /> : null}
          {label}
        </span>
        {!conflicted && (waiting || state === "error") ? (
          <button type="button" onClick={onSaveNow} className="rounded px-1 font-medium underline underline-offset-2 hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2">
            {state === "error" ? "Retry save" : "Save now"}
          </button>
        ) : null}
      </div>
      {waiting ? (
        <progress
          aria-label="Time until autosave"
          aria-valuetext={`Autosave starts after ${seconds} more seconds without editing`}
          max={delayMs}
          value={delayMs - remaining}
          className="mt-1 block h-1 w-40 max-w-full accent-[var(--foreground)]"
        />
      ) : saving ? (
        <progress aria-label="Saving document" className="mt-1 block h-1 w-40 max-w-full accent-[var(--foreground)]" />
      ) : null}
      {waiting || saving || state === "error" || conflicted ? (
        <p className="mt-1 text-[var(--muted-soft)]">Keep this page open until your changes are saved.</p>
      ) : null}
    </div>
  );
}
