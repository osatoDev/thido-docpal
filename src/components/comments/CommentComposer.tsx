"use client";

import { useState } from "react";

const AI_EDIT_SUGGESTIONS = {
  DOCUMENT: [
    "Add a concise conclusion",
    "Remove repeated points",
    "Make the tone more formal",
  ],
  SELECTION: [
    "Expand this with a useful example",
    "Remove this passage",
    "Rewrite this more clearly",
  ],
} as const;

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
            Edit the document with Thido
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Tell Thido what to add, remove, rewrite, or restyle. Clear edit
            instructions follow your AI edit preference in Settings.
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-xs font-semibold text-[var(--foreground)]">
            Edit the selected text with Thido
          </p>
          <blockquote className="border-l-2 border-[var(--warm)] pl-2 text-xs italic text-[var(--muted)]">
            &ldquo;{quotedText}&rdquo;
          </blockquote>
        </div>
      )}
      <textarea
        autoFocus
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          scope === "DOCUMENT"
            ? "E.g. Add a summary after the introduction, or remove the second section…"
            : "E.g. Shorten this, remove it, or expand it with an example…"
        }
        aria-label={
          scope === "DOCUMENT"
            ? "Instruction for Thido about the document"
            : "Instruction for Thido about the selected text"
        }
        className="app-input resize-none rounded-sm p-2 text-sm outline-none"
      />
      <div className="flex flex-wrap gap-1.5" aria-label="Example instructions">
        {AI_EDIT_SUGGESTIONS[scope].map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setBody(suggestion)}
            className="rounded-full border border-[var(--border)] px-2 py-1 text-left text-[11px] leading-4 text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)]"
          >
            {suggestion}
          </button>
        ))}
      </div>
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
          Send to Thido
        </button>
      </div>
    </form>
  );
}
