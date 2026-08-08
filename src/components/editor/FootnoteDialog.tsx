"use client";

import { useEffect, useId, useState } from "react";

export function FootnoteDialog({
  onInsert,
  onClose,
}: {
  onInsert: (text: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [text, setText] = useState("");

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/45 p-4 pt-[12vh]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="app-panel w-full max-w-lg rounded-xl p-5 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold">
            Insert footnote
          </h2>
          <button
            type="button"
            aria-label="Close footnote dialog"
            title="Close"
            onClick={onClose}
            className="app-button-secondary inline-flex size-8 items-center justify-center p-0 text-lg"
          >
            ×
          </button>
        </div>
        <p id={descriptionId} className="mt-2 text-sm text-[var(--muted)]">
          A numbered reference is added here and the note is placed at the end
          of the document.
        </p>
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = text.trim();
            if (!trimmed) return;
            onInsert(trimmed);
            onClose();
          }}
        >
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Footnote text</span>
            <textarea
              autoFocus
              rows={4}
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="app-input resize-y rounded-md px-3 py-2 outline-none"
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="app-button-secondary px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="app-button-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Insert
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
