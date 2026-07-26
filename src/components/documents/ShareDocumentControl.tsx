"use client";

import Link from "next/link";
import { useState } from "react";

export function ShareDocumentControl({
  documentId,
  initialShareToken,
}: {
  documentId: string;
  initialShareToken: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sharePath = shareToken ? `/share/${shareToken}` : null;

  async function enableSharing() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.shareToken !== "string") {
        throw new Error("Could not create the share link.");
      }
      setShareToken(result.shareToken);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyShareLink() {
    if (!sharePath) return;

    try {
      const shareUrl = new URL(sharePath, window.location.origin).toString();
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setError("Could not copy the link. Open it and copy the URL instead.");
    }
  }

  async function stopSharing() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Could not stop sharing.");
      }
      setShareToken(null);
      setConfirmingStop(false);
      setCopied(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="document-share-panel"
        onClick={() => {
          setOpen((current) => !current);
          setError(null);
          setCopied(false);
          setConfirmingStop(false);
        }}
        className="secondary-button rounded-md px-3 py-1.5 text-xs font-medium"
      >
        Share
      </button>

      {open && (
        <div
          id="document-share-panel"
          className="app-panel absolute top-full right-0 z-30 mt-2 w-[min(23rem,calc(100vw-2rem))] rounded-lg p-4 text-left"
        >
          <p className="text-sm font-semibold">Share this document</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Anyone with the link can view the title and document. Comments and
            editing controls stay private.
          </p>

          {sharePath ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={copyShareLink}
                  className="primary-button rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {copied ? "Copied" : "Copy link"}
                </button>
                <Link
                  href={sharePath}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button rounded-md px-3 py-2 text-xs font-semibold"
                >
                  Open link
                </Link>
              </div>

              {confirmingStop ? (
                <div className="border-t border-[var(--border)] pt-3">
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Existing links will stop working immediately.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={stopSharing}
                      className="rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
                    >
                      {busy ? "Stopping…" : "Stop sharing"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmingStop(false)}
                      className="rounded-md px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-subtle)]"
                    >
                      Keep sharing
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingStop(true)}
                  className="self-start text-xs text-[var(--muted)] hover:text-[var(--danger)]"
                >
                  Stop sharing
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={enableSharing}
              className="primary-button mt-4 rounded-md px-3 py-2 text-xs font-semibold disabled:cursor-wait disabled:opacity-50"
            >
              {busy ? "Creating link…" : "Create share link"}
            </button>
          )}

          {error && (
            <p className="mt-3 text-xs text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
