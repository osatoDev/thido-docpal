"use client";

import { useState } from "react";
import type { CommentWithReplies, SuggestionWithStatus } from "@/lib/types";
import { SuggestionCard } from "./SuggestionCard";

export function CommentThread({
  comment,
  onChange,
  onDelete,
  onDocumentContentUpdated,
  isPending = false,
}: {
  comment: CommentWithReplies;
  onChange: (updated: CommentWithReplies) => void;
  onDelete: (id: string) => void;
  onDocumentContentUpdated: (content: unknown) => void;
  isPending?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function toggleResolved() {
    setBusy(true);
    try {
      const nextStatus = comment.status === "OPEN" ? "RESOLVED" : "OPEN";
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        onChange({ ...comment, ...data.comment });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });
      if (res.ok) onDelete(comment.id);
    } finally {
      setBusy(false);
    }
  }

  function handleSuggestionResolved(
    updated: SuggestionWithStatus,
    documentContent?: unknown,
  ) {
    onChange({
      ...comment,
      suggestion: updated,
      status: updated.status === "ACCEPTED" ? "RESOLVED" : comment.status,
    });
    if (documentContent) {
      onDocumentContentUpdated(documentContent);
    }
  }

  return (
    <div
      className={`flex flex-col gap-3 border-t border-[var(--border)] py-4 text-sm ${
        comment.status === "RESOLVED" ? "opacity-60" : ""
      }`}
    >
      <blockquote className="border-l-2 border-[var(--border-strong)] pl-2 text-xs italic text-[var(--muted)]">
        &ldquo;{comment.quotedText}&rdquo;
        {comment.isOrphaned && (
          <span className="ml-1 not-italic text-[var(--warm)]">
            (highlighted text was removed)
          </span>
        )}
      </blockquote>

      <p>{comment.body}</p>

      {isPending && (
        <p className="flex items-center gap-2 text-xs text-[var(--muted)]" role="status">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-strong)]" />
          Saved — Thido is responding in the background
        </p>
      )}
      {comment.suggestion && (
        <SuggestionCard
          suggestion={comment.suggestion}
          onResolved={handleSuggestionResolved}
        />
      )}

      {comment.replies.length > 0 && (
        <div className="flex flex-col gap-2 border-l pl-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="text-xs">
              <span className="font-medium text-[var(--foreground)]">
                {reply.authorType === "AI" ? "Thido AI" : "You"}
              </span>
              <p className="text-[var(--muted)]">{reply.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-[var(--muted-soft)]">
        <button
          type="button"
          disabled={busy}
          onClick={toggleResolved}
          className="hover:text-[var(--foreground)]"
        >
          {comment.status === "OPEN" ? "Resolve" : "Reopen"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleDelete}
          className="hover:text-[var(--danger)]"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
