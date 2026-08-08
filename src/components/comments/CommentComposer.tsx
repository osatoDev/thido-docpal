"use client";

import { useState } from "react";

export function CommentComposer({
  scope,
  quotedText,
  onSubmit,
  onCancel,
}: {
  scope: "SELECTION" | "DOCUMENT";
  quotedText?: string;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    onSubmit(body.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-t border-[var(--border-strong)] pt-3"
    >
      {scope === "DOCUMENT" ? (
        <div className="rounded-sm bg-[var(--surface-subtle)] p-3">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            Comment on the whole document
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Thido will consider the entire draft, not just selected text.
          </p>
        </div>
      ) : (
        <blockquote className="border-l-2 border-[var(--warm)] pl-2 text-xs italic text-[var(--muted)]">
          &ldquo;{quotedText}&rdquo;
        </blockquote>
      )}
      <textarea
        autoFocus
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          scope === "DOCUMENT"
            ? "E.g. Remove all Markdown from this document…"
            : "Ask a question or request a change…"
        }
        aria-label={
          scope === "DOCUMENT"
            ? "Document-wide comment"
            : "Comment on selected text"
        }
        className="app-input resize-none rounded-sm p-2 text-sm outline-none"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-subtle)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!body.trim()}
          className="primary-button rounded-sm px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {scope === "DOCUMENT"
            ? "Comment on document"
            : "Comment on selected text"}
        </button>
      </div>
    </form>
  );
}
