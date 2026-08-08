"use client";

import { useEffect, useId, useState } from "react";

export function BookmarkDialog({
  initialLabel = "",
  mode,
  onSubmit,
  onClose,
}: {
  initialLabel?: string;
  mode: "insert" | "rename";
  onSubmit: (label: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const title = mode === "insert" ? "Insert bookmark" : "Rename bookmark";

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
        className="app-panel w-full max-w-md rounded-xl p-5 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label={`Close ${title.toLowerCase()}`}
            title="Close"
            onClick={onClose}
            className="app-button-secondary inline-flex size-8 items-center justify-center p-0 text-lg"
          >
            ×
          </button>
        </div>
        <p id={descriptionId} className="mt-2 text-sm text-[var(--muted)]">
          Bookmarks create durable destinations you can navigate to and share.
        </p>
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = label.trim();
            if (!trimmed) return;
            onSubmit(trimmed);
            onClose();
          }}
        >
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Bookmark name</span>
            <input
              autoFocus
              type="text"
              maxLength={80}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="app-input rounded-md px-3 py-2 outline-none"
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
              disabled={!label.trim()}
              className="app-button-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mode === "insert" ? "Insert" : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
