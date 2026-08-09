"use client";

import { useEffect, useId, useState } from "react";

import { normalizeCustomBulletGlyph } from "./extensions/StyledBulletList";

const SUGGESTED_GLYPHS = ["❖", "➜", "➢", "✦", "✧", "☞", "※", "‣"];

export function CustomBulletDialog({
  initialGlyph = "",
  onSubmit,
  onClose,
}: {
  initialGlyph?: string;
  onSubmit: (glyph: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [glyph, setGlyph] = useState(initialGlyph);
  const normalizedGlyph = normalizeCustomBulletGlyph(glyph);

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
        className="app-panel w-full max-w-md rounded-lg p-5 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold">
            Custom bullet
          </h2>
          <button
            type="button"
            aria-label="Close custom bullet dialog"
            title="Close"
            onClick={onClose}
            className="app-button-secondary inline-flex size-8 items-center justify-center p-0 text-lg"
          >
            ×
          </button>
        </div>
        <p id={descriptionId} className="mt-2 text-sm text-[var(--muted)]">
          Choose one symbol for the selected list.
        </p>
        <div className="mt-4 grid grid-cols-8 gap-1" aria-label="Suggested bullets">
          {SUGGESTED_GLYPHS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              aria-label={`Use ${suggestion} as the bullet`}
              onClick={() => setGlyph(suggestion)}
              className={`inline-flex aspect-square items-center justify-center rounded-sm border text-lg ${
                glyph === suggestion
                  ? "border-[var(--accent-strong)] bg-[var(--surface-subtle)]"
                  : "border-[var(--border)] hover:bg-[var(--surface-subtle)]"
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!normalizedGlyph) return;
            onSubmit(normalizedGlyph);
            onClose();
          }}
        >
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Bullet symbol</span>
            <input
              autoFocus
              type="text"
              maxLength={16}
              value={glyph}
              onChange={(event) => setGlyph(event.target.value)}
              aria-invalid={glyph.length > 0 && !normalizedGlyph}
              className="app-input rounded-md px-3 py-2 text-lg outline-none"
            />
          </label>
          {glyph.length > 0 && !normalizedGlyph ? (
            <p className="mt-2 text-xs text-[var(--danger)]" role="alert">
              Enter one symbol, not a letter, number, or punctuation sequence.
            </p>
          ) : null}
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
              disabled={!normalizedGlyph}
              className="app-button-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
