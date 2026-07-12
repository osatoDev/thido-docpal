"use client";

import { useState } from "react";
import type { CommentWithReplies, SuggestionWithStatus } from "@/lib/types";
import { SuggestionCard } from "./SuggestionCard";

export function CommentThread({
  comment,
  onChange,
  onDelete,
  onDocumentContentUpdated,
}: {
  comment: CommentWithReplies;
  onChange: (updated: CommentWithReplies) => void;
  onDelete: (id: string) => void;
  onDocumentContentUpdated: (content: unknown) => void;
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
      className={`flex flex-col gap-2 rounded-md border p-3 text-sm ${
        comment.status === "RESOLVED" ? "opacity-60" : ""
      }`}
    >
      <blockquote className="border-l-2 border-gray-300 pl-2 text-xs italic text-gray-500">
        &ldquo;{comment.quotedText}&rdquo;
        {comment.isOrphaned && (
          <span className="ml-1 not-italic text-amber-600">
            (highlighted text was removed)
          </span>
        )}
      </blockquote>

      <p>{comment.body}</p>

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
              <span className="font-medium text-gray-700">
                {reply.authorType === "AI" ? "Thido AI" : "You"}
              </span>
              <p className="text-gray-600">{reply.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <button
          type="button"
          disabled={busy}
          onClick={toggleResolved}
          className="hover:text-gray-700"
        >
          {comment.status === "OPEN" ? "Resolve" : "Reopen"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleDelete}
          className="hover:text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
