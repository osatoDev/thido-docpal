"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  type RestoredDocument,
  VersionHistoryDialog,
} from "@/components/documents/VersionHistoryControl";

export function DocumentMoreActions({
  documentId,
  currentRevision,
  canImport,
  canViewHistory,
  onImport,
  onConflict,
}: {
  documentId: string;
  currentRevision: number;
  canImport: boolean;
  canViewHistory: boolean;
  onImport: (document: RestoredDocument) => void;
  onConflict: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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

  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            setOpen((current) => !current);
            setError(null);
            setMessage(null);
          }}
          aria-expanded={open}
          aria-controls={menuId}
          aria-label="More document actions"
          className="secondary-button inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium"
        >
          More
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-3 fill-none stroke-current"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 8 4 4 4-4" />
          </svg>
        </button>

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

        {open ? (
          <div
            id={menuId}
            className="app-panel absolute top-full left-0 z-30 mt-2 w-56 rounded-md p-2 text-xs"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                window.print();
              }}
              className="block w-full rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)]"
            >
              Print
            </button>
            {canImport ? (
              <button
                type="button"
                disabled={importing}
                onClick={() => inputRef.current?.click()}
                className="block w-full rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)] disabled:cursor-wait disabled:opacity-60"
              >
                {importing ? "Importing Word…" : "Import Word (.docx)"}
              </button>
            ) : null}
            {canViewHistory ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setHistoryOpen(true);
                }}
                className="block w-full rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)]"
              >
                Version history
              </button>
            ) : null}
          </div>
        ) : null}

        {message ? (
          <p
            className="absolute top-full left-0 z-20 mt-2 w-80 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--muted)] shadow-sm"
            role="status"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            className="absolute top-full left-0 z-20 mt-2 w-80 rounded-md border border-[var(--danger)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--danger)] shadow-sm"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>

      {historyOpen ? (
        <VersionHistoryDialog
          documentId={documentId}
          currentRevision={currentRevision}
          onClose={closeHistory}
          onRestore={onImport}
          onConflict={onConflict}
        />
      ) : null}
    </>
  );
}
