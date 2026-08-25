"use client";

import { useEffect, useRef, useState } from "react";

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
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    onSubmit(body.trim());
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-t border-[var(--border-strong)] pt-3"
    >
      <div>
        <p className="mb-2 text-xs font-semibold text-[var(--foreground)]">
          Comment on the selected text
        </p>
        <blockquote className="border-l-2 border-[var(--warm)] pl-2 text-xs italic text-[var(--muted)]">
          &ldquo;{quotedText}&rdquo;
        </blockquote>
      </div>
      <textarea
        autoFocus
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="E.g. Shorten this, remove it, or expand it with an example…"
        aria-label="Comment about the selected text"
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
          Add comment
        </button>
      </div>
    </form>
  );
}
