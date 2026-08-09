"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  type RestoredDocument,
  VersionHistoryDialog,
} from "@/components/documents/VersionHistoryControl";

type DocumentLanguageOption = {
  label: string;
  value: string;
};

export function DocumentFileMenu({
  documentId,
  currentRevision,
  canImport,
  canViewHistory,
  canChangeLanguage,
  documentLanguage,
  languageOptions,
  onImport,
  onConflict,
  onLanguageChange,
}: {
  documentId: string;
  currentRevision: number;
  canImport: boolean;
  canViewHistory: boolean;
  canChangeLanguage: boolean;
  documentLanguage: string;
  languageOptions: readonly DocumentLanguageOption[];
  onImport: (document: RestoredDocument) => void;
  onConflict: (message: string) => void;
  onLanguageChange: (language: string) => void;
}) {
  const wordInputRef = useRef<HTMLInputElement>(null);
  const markdownInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const languageTitleId = useId();
  const languageDescriptionId = useId();
  const openTitleId = useId();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [openDocumentDialog, setOpenDocumentDialog] = useState(false);
  const [openDocuments, setOpenDocuments] = useState<
    Array<{
      id: string;
      title: string;
      status: "DRAFTING" | "GENERATING" | "READY";
      updatedAt: string;
    }>
  >([]);
  const [openDocumentsLoading, setOpenDocumentsLoading] = useState(false);
  const [openDocumentsError, setOpenDocumentsError] = useState<string | null>(null);
  const [openDocumentSearch, setOpenDocumentSearch] = useState("");
  const [languageDraft, setLanguageDraft] = useState(documentLanguage);
  const [importingType, setImportingType] = useState<
    "Markdown" | "Word" | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filteredOpenDocuments = useMemo(() => {
    const query = openDocumentSearch.trim().toLocaleLowerCase();
    return query
      ? openDocuments.filter((document) =>
          document.title.toLocaleLowerCase().includes(query),
        )
      : openDocuments;
  }, [openDocumentSearch, openDocuments]);

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

  useEffect(() => {
    if (!languageOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setLanguageOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [languageOpen]);

  useEffect(() => {
    if (!openDocumentDialog) return;
    let cancelled = false;

    void fetch("/api/documents", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(body?.documents)) {
          throw new Error(body?.error || "Could not load your documents.");
        }
        if (!cancelled) setOpenDocuments(body.documents);
      })
      .catch((reason) => {
        if (!cancelled) {
          setOpenDocumentsError(
            reason instanceof Error
              ? reason.message
              : "Could not load your documents.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setOpenDocumentsLoading(false);
      });

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenDocumentDialog(false);
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openDocumentDialog]);

  async function importDocumentFile(file: File, input: HTMLInputElement) {
    const isMarkdown = file.name.toLowerCase().endsWith(".md");
    if (
      !window.confirm(
        `Importing this ${isMarkdown ? "Markdown" : "Word"} file will replace the current title and document body. You can restore the current version from Version history. Continue?`,
      )
    ) {
      input.value = "";
      return;
    }

    setImportingType(isMarkdown ? "Markdown" : "Word");
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
        const responseRequestId =
          (typeof body?.requestId === "string" && body.requestId) ||
          response.headers.get("x-thido-request-id");
        const responseError =
          typeof body?.error === "string"
            ? body.error
            : typeof body?.error?.message === "string"
              ? body.error.message
              : "Could not import this document.";
        const errorWithReference = responseRequestId
          ? `${responseError} Reference: ${responseRequestId}`
          : responseError;
        if (body?.documentConflict === true) {
          onConflict(errorWithReference);
        }
        throw new Error(errorWithReference);
      }
      onImport(body.document as RestoredDocument);
      const warnings = Array.isArray(body.warnings)
        ? body.warnings.filter((warning: unknown) => typeof warning === "string")
        : [];
      setMessage(
        warnings.length > 0
          ? `Imported with notes: ${warnings.join(" ")}`
          : `${isMarkdown ? "Markdown" : "Word"} document imported.`,
      );
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not import this document.",
      );
    } finally {
      setImportingType(null);
      input.value = "";
    }
  }

  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
    triggerRef.current?.focus();
  }, []);

  function closeLanguage() {
    setLanguageOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  function closeOpenDocumentDialog() {
    setOpenDocumentDialog(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

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
          ref={wordInputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          aria-label="Choose a Word document to import"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void importDocumentFile(file, event.currentTarget);
          }}
        />

        <input
          ref={markdownInputRef}
          type="file"
          accept=".md,text/markdown,text/plain"
          className="sr-only"
          aria-label="Choose a Markdown document to import"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void importDocumentFile(file, event.currentTarget);
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
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setOpenDocumentSearch("");
                setOpenDocumentsLoading(true);
                setOpenDocumentsError(null);
                setOpenDocumentDialog(true);
              }}
              className="block w-full rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)]"
            >
              Open…
            </button>
            {canImport ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  disabled={importingType !== null}
                  aria-disabled={importingType !== null}
                  onClick={() => wordInputRef.current?.click()}
                  className="block w-full rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)] disabled:cursor-wait disabled:opacity-60"
                >
                  {importingType === "Word"
                    ? "Importing Word…"
                    : "Import Word (.docx)…"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={importingType !== null}
                  aria-disabled={importingType !== null}
                  onClick={() => markdownInputRef.current?.click()}
                  className="block w-full rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)] disabled:cursor-wait disabled:opacity-60"
                >
                  {importingType === "Markdown"
                    ? "Importing Markdown…"
                    : "Import Markdown (.md)…"}
                </button>
              </>
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
            {canChangeLanguage ? (
              <>
                <div
                  role="separator"
                  className="my-1 border-t border-[var(--border)]"
                />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setLanguageDraft(documentLanguage);
                    setOpen(false);
                    setLanguageOpen(true);
                  }}
                  className="flex w-full items-center justify-between gap-4 rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)]"
                >
                  <span>Language</span>
                  <span className="truncate text-xs text-[var(--muted)]">
                    {languageOptions.find(
                      (option) => option.value === documentLanguage,
                    )?.label ?? documentLanguage}
                  </span>
                </button>
              </>
            ) : null}
            <div role="separator" className="my-1 border-t border-[var(--border)]" />
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={downloadOpen}
              onClick={() => setDownloadOpen((current) => !current)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight") return;
                event.preventDefault();
                setDownloadOpen(true);
                window.requestAnimationFrame(() => {
                  menuRef.current
                    ?.querySelector<HTMLElement>(
                      '[aria-label="Download"] [role="menuitem"]',
                    )
                    ?.focus();
                });
              }}
              className="flex w-full items-center justify-between gap-4 rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)]"
            >
              <span>Download</span>
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className={`size-3.5 fill-none stroke-current transition-transform ${downloadOpen ? "rotate-90" : ""}`}
                strokeWidth="1.8"
              >
                <path d="m6 3 5 5-5 5" />
              </svg>
            </button>
            {downloadOpen ? (
              <div
                role="menu"
                aria-label="Download"
                className="mx-1 mb-1 border-s border-[var(--border)] ps-1"
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft") return;
                  event.preventDefault();
                  setDownloadOpen(false);
                  window.setTimeout(() => {
                    menuRef.current
                      ?.querySelector<HTMLButtonElement>(
                        '[aria-haspopup="menu"][aria-expanded="false"]',
                      )
                      ?.focus();
                  }, 0);
                }}
              >
                <a
                  role="menuitem"
                  href={`/api/documents/${documentId}/export/docx`}
                  className="block rounded-sm px-5 py-2 hover:bg-[var(--surface-subtle)]"
                  onClick={() => setOpen(false)}
                >
                  Microsoft Word (.docx)
                </a>
                <a
                  role="menuitem"
                  href={`/api/documents/${documentId}/export/pdf`}
                  className="block rounded-sm px-5 py-2 hover:bg-[var(--surface-subtle)]"
                  onClick={() => setOpen(false)}
                >
                  PDF document (.pdf)
                </a>
              </div>
            ) : null}
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
      {languageOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/45 p-4 pt-[12vh]"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeLanguage();
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={languageTitleId}
            aria-describedby={languageDescriptionId}
            className="app-panel max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-xl p-5 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              onLanguageChange(languageDraft);
              closeLanguage();
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id={languageTitleId} className="text-base font-semibold">
                Document language
              </h2>
              <button
                type="button"
                aria-label="Close document language"
                title="Close"
                onClick={closeLanguage}
                className="app-button-secondary inline-flex size-8 items-center justify-center p-0 text-lg"
              >
                ×
              </button>
            </div>
            <p
              id={languageDescriptionId}
              className="mt-2 text-sm leading-6 text-[var(--muted)]"
            >
              Sets the language used by browser spelling suggestions for this
              document. It does not translate the text.
            </p>
            <fieldset className="mt-4 space-y-1">
              <legend className="sr-only">Choose a document language</legend>
              {languageOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-sm hover:bg-[var(--surface-subtle)]"
                >
                  <input
                    type="radio"
                    name="document-language"
                    value={option.value}
                    checked={languageDraft === option.value}
                    autoFocus={option.value === documentLanguage}
                    onChange={() => setLanguageDraft(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeLanguage}
                className="secondary-button rounded-sm px-3 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button rounded-sm px-3 py-2 text-sm font-medium"
              >
                Save language
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {openDocumentDialog ? (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/45 p-4 pt-[8vh]"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOpenDocumentDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={openTitleId}
            className="app-panel flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
              <h2 id={openTitleId} className="text-lg font-semibold">
                Open a document
              </h2>
              <button
                type="button"
                aria-label="Close open document dialog"
                title="Close"
                onClick={closeOpenDocumentDialog}
                className="app-button-secondary inline-flex size-8 items-center justify-center p-0 text-lg"
              >
                ×
              </button>
            </div>
            <div className="border-b border-[var(--border)] p-4">
              <input
                type="search"
                value={openDocumentSearch}
                onChange={(event) => setOpenDocumentSearch(event.target.value)}
                placeholder="Search your documents"
                aria-label="Search your documents"
                autoFocus
                className="app-input w-full rounded-md px-3 py-2.5 text-sm outline-none"
              />
            </div>
            <div className="min-h-56 overflow-y-auto p-2">
              {openDocumentsLoading ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--muted)]" role="status">
                  Loading documents…
                </p>
              ) : openDocumentsError ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--danger)]" role="alert">
                  {openDocumentsError}
                </p>
              ) : filteredOpenDocuments.length > 0 ? (
                <ul>
                  {filteredOpenDocuments.map((document) => (
                      <li key={document.id}>
                        <Link
                          href={
                            document.status === "READY"
                              ? `/documents/${document.id}/edit`
                              : `/documents/${document.id}/wizard`
                          }
                          className="flex items-center justify-between gap-4 rounded-md px-3 py-3 hover:bg-[var(--surface-subtle)]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {document.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-[var(--muted)]">
                              {document.id === documentId
                                ? "Current document"
                                : document.status === "READY"
                                  ? "Thido document"
                                  : "Draft in progress"}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-[var(--muted)]">
                            {new Intl.DateTimeFormat(undefined, {
                              dateStyle: "medium",
                            }).format(new Date(document.updatedAt))}
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">
                  No matching documents.
                </p>
              )}
            </div>
            <div className="flex justify-end border-t border-[var(--border)] px-5 py-4">
              <Link
                href="/dashboard"
                className="secondary-button rounded-sm px-3 py-2 text-sm font-medium"
              >
                View all documents
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
