"use client";

import { useState } from "react";

export function CommentComposer({
  quotedText,
  onSubmit,
  onCancel,
}: {
  quotedText: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    await onSubmit(body.trim());
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-md border bg-white p-3 shadow-sm"
    >
      <blockquote className="border-l-2 border-amber-400 pl-2 text-xs italic text-gray-500">
        &ldquo;{quotedText}&rdquo;
      </blockquote>
      <textarea
        autoFocus
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ask a question or request a change…"
        className="resize-none rounded-md border p-2 text-sm outline-none focus:ring-1 focus:ring-black"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Comment"}
        </button>
      </div>
    </form>
  );
}
