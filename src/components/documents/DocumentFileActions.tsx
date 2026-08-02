"use client";

import { useRef, useState } from "react";

import type { RestoredDocument } from "@/components/documents/VersionHistoryControl";

export function DocumentFileActions({
  documentId,
  currentRevision,
  canImport,
  onImport,
  onConflict,
}: {
  documentId: string;
  currentRevision: number;
  canImport: boolean;
  onImport: (document: RestoredDocument) => void;
  onConflict: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function importWordFile(file: File) {
    if (
      !window.confirm(
        "Importing this Word file will replace the current title and document body. You can restore the current version from Version history. Continue?",
      )
    ) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setImporting(true);
    setMessage(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("baseRevision", String(currentRevision));
      const response = await fetch(`/api/documents/${documentId}/import`, {
        method: "POST",
        body: formData,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.document) {
        if (body?.documentConflict === true) {
          onConflict(
            typeof body.error === "string"
              ? body.error
              : "This document changed somewhere else.",
          );
        }
        throw new Error(body?.error || "Could not import this Word file.");
      }
      onImport(body.document as RestoredDocument);
      const warnings = Array.isArray(body.warnings)
        ? body.warnings.filter((warning: unknown) => typeof warning === "string")
        : [];
      setMessage(
        warnings.length > 0
          ? `Imported with notes: ${warnings.join(" ")}`
          : "Word document imported.",
      );
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not import this Word file.",
      );
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setError(null);
          setMessage(null);
        }}
        aria-expanded={open}
        aria-controls="document-file-actions"
        className="secondary-button rounded-sm px-3 py-1.5 text-xs font-medium"
      >
        File
      </button>

      {open ? (
        <div
          id="document-file-actions"
          className="app-panel absolute top-full right-0 z-30 mt-2 w-64 rounded-md p-2 text-xs"
        >
          <a
            href={`/api/documents/${documentId}/export/docx`}
            className="block rounded-sm px-3 py-2 hover:bg-[var(--surface-subtle)]"
            onClick={() => setOpen(false)}
          >
            Download Word (.docx)
          </a>
          <a
            href={`/api/documents/${documentId}/export/pdf`}
            className="block rounded-sm px-3 py-2 hover:bg-[var(--surface-subtle)]"
            onClick={() => setOpen(false)}
          >
            Download PDF
          </a>
          {canImport ? (
            <>
              <div className="my-1 border-t border-[var(--border)]" />
              <input
                ref={inputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                aria-label="Choose a Word document to import"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void importWordFile(file);
                }}
              />
              <button
                type="button"
                disabled={importing}
                onClick={() => inputRef.current?.click()}
                className="block w-full rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)] disabled:cursor-wait disabled:opacity-60"
              >
                {importing ? "Importing Word…" : "Import Word (.docx)"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <p
          className="absolute top-full right-0 z-20 mt-2 w-80 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--muted)] shadow-sm"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          className="absolute top-full right-0 z-20 mt-2 w-80 rounded-md border border-[var(--danger)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--danger)] shadow-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
