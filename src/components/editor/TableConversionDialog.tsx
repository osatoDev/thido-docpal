"use client";

import { useEffect, useId, useRef } from "react";

import type { DetectedTextTable } from "@/lib/textTable";

export function TableConversionDialog({
  table,
  onConvert,
  onKeepText,
}: {
  table: DetectedTextTable;
  onConvert: () => void;
  onKeepText: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const convertButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    convertButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onKeepText();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onKeepText]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/45 p-4 pt-[12vh]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onKeepText();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="app-panel w-full max-w-md rounded-xl p-5 shadow-xl"
      >
        <p className="page-kicker mb-2">Table detected</p>
        <h2 id={titleId} className="text-lg font-semibold">
          Convert this text to a table?
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Thido found {table.rows.length} rows and {table.rows[0].length} columns.
          The first row will become the table header.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onKeepText}
            className="secondary-button rounded-sm px-3 py-2 text-sm font-medium"
          >
            Keep as text
          </button>
          <button
            ref={convertButtonRef}
            type="button"
            onClick={onConvert}
            className="primary-button rounded-sm px-3 py-2 text-sm font-medium"
          >
            Convert to table
          </button>
        </div>
      </section>
    </div>
  );
}
