"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { EditorMenu, type MenuItem } from "@/components/editor/EditorMenu";
import {
  type RestoredDocument,
  VersionHistoryDialog,
} from "@/components/documents/VersionHistoryControl";
import {
  DOCUMENT_IMPORT_ACCEPT,
  DOCUMENT_IMPORT_NOTES_NOTICE_MS,
  DOCUMENT_IMPORT_SUCCESS_NOTICE_MS,
  SUPPORTED_DOCUMENT_FILE_LABEL,
} from "@/lib/documentFileTypes";
import { documentEditPath } from "@/lib/documentUrls";

type DocumentLanguageOption = {
  label: string;
  value: string;
};

type ImportNotice = {
  dismissAfterMs: number;
  text: string;
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
  const documentInputRef = useRef<HTMLInputElement>(null);
  const languageTitleId = useId();
  const languageDescriptionId = useId();
  const openTitleId = useId();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
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
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<ImportNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messageDismissAfterMs = message?.dismissAfterMs;
  const messageText = message?.text;
  const filteredOpenDocuments = useMemo(() => {
    const query = openDocumentSearch.trim().toLocaleLowerCase();
    return query
      ? openDocuments.filter((document) =>
          document.title.toLocaleLowerCase().includes(query),
        )
      : openDocuments;
  }, [openDocumentSearch, openDocuments]);

  useEffect(() => {
    if (!languageOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setLanguageOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [languageOpen]);

  useEffect(() => {
    if (!messageDismissAfterMs || !messageText) return;
    const timeout = window.setTimeout(() => {
      setMessage((current) =>
        current?.text === messageText ? null : current,
      );
    }, messageDismissAfterMs);
    return () => window.clearTimeout(timeout);
  }, [messageDismissAfterMs, messageText]);

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
      if (event.key === "Escape") setOpenDocumentDialog(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openDocumentDialog]);

  async function importDocumentFile(file: File, input: HTMLInputElement) {
    if (
      !window.confirm(
        "Importing this document will replace the current title and document body. You can restore the current version from Version history. Continue?",
      )
    ) {
      input.value = "";
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
      setMessage({
        dismissAfterMs:
          warnings.length > 0
            ? DOCUMENT_IMPORT_NOTES_NOTICE_MS
            : DOCUMENT_IMPORT_SUCCESS_NOTICE_MS,
        text:
          warnings.length > 0
            ? `Imported with notes: ${warnings.join(" ")}`
            : "Document imported.",
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not import this document.",
      );
    } finally {
      setImporting(false);
      input.value = "";
    }
  }

  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  const activeLanguageLabel =
    languageOptions.find((option) => option.value === documentLanguage)?.label ??
    documentLanguage;

  const fileMenuGroups: MenuItem[][] = [
    [
      {
        label: "Open…",
        onSelect: () => {
          setOpenDocumentSearch("");
          setOpenDocumentsLoading(true);
          setOpenDocumentsError(null);
          setOpenDocumentDialog(true);
        },
      },
      ...(canImport
        ? [
            {
              label: importing ? "Importing document…" : "Import document…",
              disabled: importing,
              onSelect: () => documentInputRef.current?.click(),
            },
          ]
        : []),
      ...(canViewHistory
        ? [{ label: "Version history", onSelect: () => setHistoryOpen(true) }]
        : []),
    ],
    ...(canChangeLanguage
      ? [
          [
            {
              label: `Language: ${activeLanguageLabel}`,
              onSelect: () => {
                setLanguageDraft(documentLanguage);
                setLanguageOpen(true);
              },
            },
          ],
        ]
      : []),
    [
      {
        label: "Download",
        children: [
          {
            label: "Microsoft Word (.docx)",
            onSelect: () => {
              window.location.href = `/api/documents/${documentId}/export/docx`;
            },
          },
          {
            label: "PDF document (.pdf)",
            onSelect: () => {
              window.location.href = `/api/documents/${documentId}/export/pdf`;
            },
          },
        ],
      },
    ],
    [{ label: "Print", onSelect: () => window.print() }],
  ];

  return (
    <>
      <div className="relative">
        <EditorMenu
          label="File"
          tooltip="Open, import, download, print, and more"
          groups={fileMenuGroups}
        />

        <input
          ref={documentInputRef}
          type="file"
          accept={DOCUMENT_IMPORT_ACCEPT}
          className="sr-only"
          aria-label={`Choose a document to import. Supported formats: ${SUPPORTED_DOCUMENT_FILE_LABEL}.`}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void importDocumentFile(file, event.currentTarget);
          }}
        />

        {message ? (
          <p
            className="absolute top-full left-0 z-20 mt-2 w-80 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--muted)] shadow-sm"
            role="status"
          >
            {message.text}
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
            if (event.target === event.currentTarget) setLanguageOpen(false);
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
              setLanguageOpen(false);
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id={languageTitleId} className="text-base font-semibold">
                Document language
              </h2>
              <button
                type="button"
                aria-label="Close document language"
                onClick={() => setLanguageOpen(false)}
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
                onClick={() => setLanguageOpen(false)}
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
              setOpenDocumentDialog(false);
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
                onClick={() => setOpenDocumentDialog(false)}
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
                              ? documentEditPath(document.id, document.title)
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
