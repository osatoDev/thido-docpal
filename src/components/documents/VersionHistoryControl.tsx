"use client";

import { useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";

import { PublicDocumentViewer } from "@/components/documents/PublicDocumentViewer";

type RevisionSource = "INITIAL" | "USER" | "AI" | "RESTORE" | "IMPORT";

type RevisionSummary = {
  revision: number;
  title: string;
  content: JSONContent | null;
  source: RevisionSource;
  restoredFromRevision: number | null;
  createdAt: string;
  actor: { name: string | null } | null;
};

const sourceLabels: Record<RevisionSource, string> = {
  INITIAL: "Created",
  USER: "Edited",
  AI: "Changed by Thido",
  RESTORE: "Restored",
  IMPORT: "Imported from Word",
};

export type RestoredDocument = {
  title: string;
  content: JSONContent | null;
  revision: number;
};

export function VersionHistoryDialog({
  documentId,
  currentRevision,
  onClose,
  onRestore,
  onConflict,
}: {
  documentId: string;
  currentRevision: number;
  onClose: () => void;
  onRestore: (document: RestoredDocument) => void;
  onConflict: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [revisions, setRevisions] = useState<RevisionSummary[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected =
    revisions.find((revision) => revision.revision === selectedRevision) ??
    revisions[0];

  useEffect(() => {
    let cancelled = false;
    dialogRef.current?.focus();

    async function loadHistory() {
      try {
        const response = await fetch(`/api/documents/${documentId}/revisions`, {
          cache: "no-store",
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error || "Could not load version history.");
        }
        if (cancelled) return;
        const nextRevisions = (body?.revisions ?? []) as RevisionSummary[];
        setRevisions(nextRevisions);
        setSelectedRevision(nextRevisions[0]?.revision ?? null);
      } catch (reason) {
        if (cancelled) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load version history.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    void loadHistory();
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [documentId, onClose]);

  async function restoreSelected() {
    if (!selected || selected.revision === currentRevision) return;
    setRestoring(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: selected.revision,
          baseRevision: currentRevision,
        }),
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
        throw new Error(body?.error || "Could not restore this version.");
      }
      onRestore(body.document as RestoredDocument);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not restore this version.",
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
        tabIndex={-1}
        className="app-panel flex max-h-[min(52rem,calc(100vh-2rem))] w-full max-w-6xl flex-col overflow-hidden rounded-lg"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 id="version-history-title" className="font-semibold">
              Version history
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Restoring creates a new version and keeps the later history.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-2 py-1 text-sm text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
            aria-label="Close version history"
          >
            Close
          </button>
        </header>

        {loading ? (
          <p className="p-6 text-sm text-[var(--muted)]" role="status">
            Loading version history…
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 md:grid-cols-[17rem_minmax(0,1fr)]">
            <div className="overflow-y-auto border-b border-[var(--border)] p-3 md:border-r md:border-b-0">
              {revisions.map((revision) => (
                <button
                  key={revision.revision}
                  type="button"
                  onClick={() => setSelectedRevision(revision.revision)}
                  className={`mb-1 w-full rounded-md px-3 py-2 text-left text-xs ${
                    selected?.revision === revision.revision
                      ? "bg-[var(--surface-subtle)] text-[var(--foreground)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-subtle)]"
                  }`}
                >
                  <span className="block font-semibold">
                    {sourceLabels[revision.source]}
                    {revision.revision === currentRevision
                      ? " · Current"
                      : ""}
                  </span>
                  <span className="mt-1 block">
                    {new Date(revision.createdAt).toLocaleString()}
                  </span>
                  <span className="mt-0.5 block">
                    {revision.actor?.name || "A collaborator"}
                  </span>
                </button>
              ))}
            </div>

            <div className="min-h-0 overflow-y-auto p-6 sm:p-8">
              {selected ? (
                <>
                  <h3 className="editor-title border-b border-[var(--border)] pb-5 font-serif text-3xl">
                    {selected.title}
                  </h3>
                  <div className="mt-6">
                    {selected.content ? (
                      <PublicDocumentViewer
                        key={selected.revision}
                        content={selected.content}
                        ariaLabel={`Preview of version ${selected.revision}`}
                      />
                    ) : (
                      <p className="text-sm text-[var(--muted)]">
                        This version is empty.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  No saved versions yet.
                </p>
              )}
            </div>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4">
          <p className="text-xs text-[var(--danger)]" role="alert">
            {error}
          </p>
          <button
            type="button"
            disabled={
              restoring || !selected || selected.revision === currentRevision
            }
            onClick={() => void restoreSelected()}
            className="primary-button ml-auto rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {restoring ? "Restoring…" : "Restore this version"}
          </button>
        </footer>
      </section>
    </div>
  );
}
