"use client";

import { useId, useRef, useState } from "react";

export function ConflictRecovery({ getText, onReload }: {
  getText: () => string;
  onReload: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(getText());
      setMessage("Your text is copied. Paste it somewhere safe before continuing.");
      setError("");
    } catch {
      setError("Copy is unavailable. Download your text instead.");
    }
  }

  function download() {
    try {
      const url = URL.createObjectURL(new Blob([getText()], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "thido-unsaved-copy.txt";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage("Download requested. Check that your file is saved before continuing.");
      setError("");
    } catch {
      setError("Download failed. Try copying your text instead.");
    }
  }

  async function reload() {
    if (!confirmed || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await onReload();
      dialog.current?.close();
    } catch {
      setError("Could not load the latest version. Your current copy is still here. Try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="print-hidden flex shrink-0 flex-wrap items-center justify-between gap-3 border border-[var(--warm)] bg-[var(--surface)] px-4 py-3 text-sm">
      <div role="alert">
        <p className="font-semibold">Your copy is out of date.</p>
        <p className="mt-1 text-xs text-[var(--muted)]">A newer version was saved elsewhere. Editing is paused. Keep your unsaved work before loading it.</p>
      </div>
      <button type="button" className="secondary-button rounded-md px-3 py-2 text-xs font-medium" onClick={() => {
        setConfirmed(false);
        setMessage("");
        setError("");
        dialog.current?.showModal();
      }}>Review recovery options</button>
      <dialog ref={dialog} aria-labelledby={headingId} aria-describedby={descriptionId}
        onCancel={(event) => { if (busyRef.current) event.preventDefault(); }}
        className="m-auto max-h-[90dvh] w-[min(32rem,calc(100%-2rem))] overflow-auto rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-6 text-[var(--foreground)] shadow-2xl backdrop:bg-black/55">
        <h2 id={headingId} className="font-display text-2xl">Keep your unsaved work</h2>
        <p id={descriptionId} className="mt-3 text-sm text-[var(--muted)]">Loading the latest version replaces this copy, including its title. Save your text first, then reapply the changes you want to keep.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={() => void copy()} className="secondary-button rounded-md px-3 py-2 text-sm">Copy my text</button>
          <button type="button" disabled={busy} onClick={download} className="secondary-button rounded-md px-3 py-2 text-sm">Download my text</button>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">Includes your current title and text. Spreadsheet formulas are kept as text. Formatting, images, and comments are not included.</p>
        <p role="status" className="mt-3 text-sm">{message}</p>
        {error ? <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        <label className="mt-5 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
          I saved what I need, or I don’t need this unsaved copy.
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" disabled={busy} onClick={() => dialog.current?.close()} className="secondary-button rounded-md px-3 py-2 text-sm">Stay here</button>
          <button type="button" disabled={!confirmed || busy} onClick={() => void reload()} className="primary-button rounded-md px-3 py-2 text-sm disabled:opacity-50">{busy ? "Loading…" : "Reload latest version"}</button>
        </div>
      </dialog>
    </div>
  );
}
