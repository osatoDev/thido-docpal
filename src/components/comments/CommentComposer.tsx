"use client";

import { useState } from "react";

export function CommentComposer({
  quotedText,
  onSubmit,
  onCancel,
}: {
  quotedText: string;
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
      className="app-panel flex flex-col gap-3 rounded-xl p-3"
    >
      <blockquote className="border-l-2 border-[var(--warm)] pl-2 text-xs italic text-[var(--muted)]">
        &ldquo;{quotedText}&rdquo;
      </blockquote>
      <textarea
        autoFocus
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ask a question or request a change…"
        className="app-input resize-none rounded-lg p-2 text-sm outline-none"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-subtle)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!body.trim()}
          className="primary-button rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          Comment
        </button>
      </div>
    </form>
  );
}
