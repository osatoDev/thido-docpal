"use client";

import { useState } from "react";
import type { CommentWithReplies, SuggestionWithStatus } from "@/lib/types";
import { SuggestionCard } from "./SuggestionCard";

export function CommentThread({
  comment,
  onChange,
  onDelete,
  onDocumentContentUpdated,
  isQueued = false,
  canManage,
  canReply,
}: {
  comment: CommentWithReplies;
  onChange: (updated: CommentWithReplies) => void;
  onDelete: (id: string) => void;
  onDocumentContentUpdated: (
    content: unknown,
    suggestion: SuggestionWithStatus,
    revision?: number,
  ) => void;
  isQueued?: boolean;
  canManage: boolean;
  canReply: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

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

  async function addMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = replyBody.trim();
    if (!body) return;
    setBusy(true);
    setReplyError(null);
    try {
      const response = await fetch(`/api/comments/${comment.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.comment) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Could not add this message.",
        );
      }
      onChange(result.comment);
      setReplyBody("");
    } catch (reason) {
      setReplyError(
        reason instanceof Error ? reason.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleSuggestionResolved(
    updated: SuggestionWithStatus,
    document?: { content?: unknown; revision?: number },
  ) {
    onChange({
      ...comment,
      suggestion: updated,
      status: updated.status === "ACCEPTED" ? "RESOLVED" : comment.status,
    });
    if (document?.content) {
      onDocumentContentUpdated(document.content, updated, document.revision);
    }
  }

  return (
    <div
      className={`flex flex-col gap-3 border-t border-[var(--border)] py-4 text-sm ${
        comment.status === "RESOLVED" ? "opacity-60" : ""
      }`}
    >
      {comment.scope === "DOCUMENT" ? (
        <p className="w-fit rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
          Whole document
        </p>
      ) : (
        <blockquote className="border-l-2 border-[var(--border-strong)] pl-2 text-xs italic text-[var(--muted)]">
          &ldquo;{comment.quotedText}&rdquo;
          {comment.isOrphaned && (
            <span className="ml-1 not-italic text-[var(--warm)]">
              (highlighted text was removed)
            </span>
          )}
        </blockquote>
      )}

      <p className="text-xs font-medium text-[var(--muted)]">
        {comment.author?.name || "Collaborator"}
      </p>
      <p>{comment.body}</p>

      {isQueued && (
        <p className="w-fit rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
          {comment.aiStatus === "FAILED" ? "Ready to retry" : "Ready for Thido"}
        </p>
      )}
      {comment.suggestion && (
        <SuggestionCard
          suggestion={comment.suggestion}
          onResolved={handleSuggestionResolved}
          canManage={canManage}
        />
      )}

      {comment.replies.length > 0 && (
        <div className="flex flex-col gap-2 border-l pl-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="text-xs">
              <span className="font-medium text-[var(--foreground)]">
                {reply.authorType === "AI"
                  ? "Thido AI"
                  : reply.author?.name || "Collaborator"}
              </span>
              <p className="text-[var(--muted)]">{reply.body}</p>
            </div>
          ))}
        </div>
      )}

      {canReply && comment.status === "OPEN" && (
        <form onSubmit={addMessage} className="flex flex-col gap-2">
          <label
            htmlFor={`comment-reply-${comment.id}`}
            className="text-xs font-medium text-[var(--muted)]"
          >
            {comment.replies.length > 0 ? "Add more context" : "Add context"}
          </label>
          <textarea
            id={`comment-reply-${comment.id}`}
            rows={2}
            maxLength={4_000}
            value={replyBody}
            disabled={busy}
            onChange={(event) => setReplyBody(event.target.value)}
            placeholder="Add detail before Thido actions this comment…"
            className="app-input resize-none rounded-sm p-2 text-xs outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !replyBody.trim()}
            className="primary-button self-end rounded-sm px-2.5 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {busy ? "Saving…" : "Add to comment"}
          </button>
          {replyError && (
            <p className="text-xs text-[var(--danger)]" role="alert">
              {replyError}
            </p>
          )}
        </form>
      )}

      {canManage && (
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
      )}
    </div>
  );
}
