"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  type RestoredDocument,
  VersionHistoryDialog,
} from "@/components/documents/VersionHistoryControl";

export function DocumentFileMenu({
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
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    menuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
      ?.focus();

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

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ) ?? [],
    );
    if (items.length === 0) return;

    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex = currentIndex;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    }
    if (event.key === "ArrowUp") {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    }
    items[nextIndex]?.focus();
  }

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
          aria-haspopup="menu"
          role="menuitem"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className="inline-flex items-center rounded-sm px-2 py-1 text-sm hover:bg-[var(--surface-subtle)]"
        >
          File
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
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="File"
            onKeyDown={handleMenuKeyDown}
            className="app-panel absolute top-full left-0 z-40 mt-1 w-64 rounded-md p-1.5 text-sm shadow-lg"
          >
            {canImport ? (
              <button
                type="button"
                role="menuitem"
                disabled={importing}
                aria-disabled={importing}
                onClick={() => inputRef.current?.click()}
                className="block w-full rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)] disabled:cursor-wait disabled:opacity-60"
              >
                {importing ? "Importing Word…" : "Import Word (.docx)"}
              </button>
            ) : null}
            {canViewHistory ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setHistoryOpen(true);
                }}
                className="block w-full rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)]"
              >
                Version history
              </button>
            ) : null}
            <div role="separator" className="my-1 border-t border-[var(--border)]" />
            <p className="px-3 py-1 text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase">
              Download
            </p>
            <a
              role="menuitem"
              href={`/api/documents/${documentId}/export/docx`}
              className="block rounded-sm px-3 py-2 hover:bg-[var(--surface-subtle)]"
              onClick={() => setOpen(false)}
            >
              Microsoft Word (.docx)
            </a>
            <a
              role="menuitem"
              href={`/api/documents/${documentId}/export/pdf`}
              className="block rounded-sm px-3 py-2 hover:bg-[var(--surface-subtle)]"
              onClick={() => setOpen(false)}
            >
              PDF document (.pdf)
            </a>
            <div role="separator" className="my-1 border-t border-[var(--border)]" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                window.print();
              }}
              className="block w-full rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)]"
            >
              Print
            </button>
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
