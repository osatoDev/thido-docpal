"use client";

import type { CommentWithReplies, SuggestionWithStatus } from "@/lib/types";
import {
  isCommentQueuedForBatch,
  partitionCommentThreads,
} from "@/lib/commentProcessing";
import { CommentThread } from "./CommentThread";

export function CommentSidebar({
  comments,
  onChange,
  onDelete,
  onDocumentContentUpdated,
  documentAiLocked,
  onActionComments,
  canCreateComments,
  canActionComments,
  canManageComments,
}: {
  comments: CommentWithReplies[];
  onChange: (updated: CommentWithReplies) => void;
  onDelete: (id: string) => void;
  onDocumentContentUpdated: (
    content: unknown,
    suggestion: SuggestionWithStatus,
    revision?: number,
  ) => void;
  documentAiLocked: boolean;
  onActionComments: () => void;
  canCreateComments: boolean;
  canActionComments: boolean;
  canManageComments: boolean;
}) {
  const { open: openComments, archived: archivedComments } =
    partitionCommentThreads(comments);
  const queuedComments = openComments.filter(isCommentQueuedForBatch);

  return (
    <aside className="flex h-full w-full shrink-0 flex-col gap-4 overflow-y-auto border-l border-[var(--border)] bg-[var(--background)] p-5 lg:w-80">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Comments
          {openComments.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-[var(--muted)]">
              {openComments.length}
            </span>
          )}
        </h2>
        {queuedComments.length > 0 && (
          <span className="text-xs text-[var(--muted)]">
            {queuedComments.length} queued
          </span>
        )}
      </div>

      {queuedComments.length > 0 && canActionComments && (
        <div className="rounded-md border border-[var(--border-strong)] bg-[var(--surface)] p-3">
          <button
            type="button"
            onClick={onActionComments}
            disabled={documentAiLocked}
            className="primary-button flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-60"
          >
            {documentAiLocked && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
            )}
            {documentAiLocked
              ? `Actioning ${queuedComments.length} ${queuedComments.length === 1 ? "comment" : "comments"}…`
              : `Action ${queuedComments.length} ${queuedComments.length === 1 ? "comment" : "comments"} with Thido`}
          </button>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Thido will read all queued feedback together and may revise any
            part of the document to produce one coherent result.
          </p>
        </div>
      )}

      {queuedComments.length > 0 && !canActionComments && (
        <p className="rounded-sm bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--muted)]">
          These comments are ready for a document editor to action together.
        </p>
      )}

      {documentAiLocked && (
        <div
          className="flex items-start gap-2 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)]"
          role="status"
        >
          <span className="mt-1 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--accent-strong)]" />
          <span>
            Thido is reading the queued comments and revising the document as
            one piece. Editing and new comments will return when it finishes.
          </span>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-xs leading-5 text-[var(--muted-soft)]">
          {canCreateComments
            ? "Select text and choose “Add comment” to leave feedback on a passage."
            : "No comments yet."}
        </p>
      ) : openComments.length === 0 ? (
        <p className="text-xs leading-5 text-[var(--muted-soft)]">
          No open comments.
        </p>
      ) : (
        openComments.map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            onChange={onChange}
            onDelete={onDelete}
            onDocumentContentUpdated={onDocumentContentUpdated}
            isQueued={isCommentQueuedForBatch(comment)}
            canManage={canManageComments}
            canReply={canCreateComments && !documentAiLocked}
          />
        ))
      )}

      {archivedComments.length > 0 && (
        <details className="border-t border-[var(--border)] pt-4">
          <summary className="flex list-none items-center justify-between text-xs font-medium text-[var(--muted)] marker:hidden">
            <span>Archive</span>
            <span>
              {archivedComments.length} resolved{" "}
              {archivedComments.length === 1 ? "comment" : "comments"}
            </span>
          </summary>
          <div className="mt-2">
            {archivedComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                onChange={onChange}
                onDelete={onDelete}
                onDocumentContentUpdated={onDocumentContentUpdated}
                isQueued={false}
                canManage={canManageComments}
                canReply={canCreateComments && !documentAiLocked}
              />
            ))}
          </div>
        </details>
      )}
    </aside>
  );
}
