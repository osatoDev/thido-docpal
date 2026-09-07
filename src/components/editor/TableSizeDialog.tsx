"use client";

import { useEffect, useId, useState } from "react";

const MIN_SIZE = 1;
const MAX_ROWS = 20;
const MAX_COLS = 10;

function parseSize(value: string, max: number): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= MIN_SIZE && parsed <= max ? parsed : null;
}

export function TableSizeDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (rows: number, cols: number) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [rows, setRows] = useState("3");
  const [cols, setCols] = useState("3");
  const parsedRows = parseSize(rows, MAX_ROWS);
  const parsedCols = parseSize(cols, MAX_COLS);
  const isValid = parsedRows !== null && parsedCols !== null;

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
            Insert table
          </h2>
          <button
            type="button"
            aria-label="Close insert table dialog"
            title="Close"
            onClick={onClose}
            className="app-button-secondary inline-flex size-8 items-center justify-center p-0 text-lg"
          >
            ×
          </button>
        </div>
        <p id={descriptionId} className="mt-2 text-sm text-[var(--muted)]">
          Choose how many rows and columns to insert.
        </p>
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (parsedRows === null || parsedCols === null) return;
            onSubmit(parsedRows, parsedCols);
            onClose();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Rows</span>
              <input
                autoFocus
                type="number"
                inputMode="numeric"
                min={MIN_SIZE}
                max={MAX_ROWS}
                step={1}
                value={rows}
                onChange={(event) => setRows(event.target.value)}
                aria-invalid={rows.length > 0 && parsedRows === null}
                className="app-input rounded-md px-3 py-2 outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Columns</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_SIZE}
                max={MAX_COLS}
                step={1}
                value={cols}
                onChange={(event) => setCols(event.target.value)}
                aria-invalid={cols.length > 0 && parsedCols === null}
                className="app-input rounded-md px-3 py-2 outline-none"
              />
            </label>
          </div>
          {(rows.length > 0 && parsedRows === null) ||
          (cols.length > 0 && parsedCols === null) ? (
            <p className="mt-2 text-xs text-[var(--danger)]" role="alert">
              Rows must be {MIN_SIZE}–{MAX_ROWS} and columns {MIN_SIZE}–
              {MAX_COLS}.
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
              disabled={!isValid}
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
