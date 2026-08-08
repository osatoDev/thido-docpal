"use client";

import type {
  CommentAiProgress,
  CommentWithReplies,
  SuggestionWithStatus,
} from "@/lib/types";
import { partitionCommentThreads } from "@/lib/commentProcessing";
import { CommentThread } from "./CommentThread";

export function CommentSidebar({
  comments,
  onChange,
  onDelete,
  onDocumentContentUpdated,
  pendingCommentIds,
  commentProgress,
  foregroundCommentCount,
  documentAiLocked,
  onStartDocumentComment,
  documentComposerOpen,
  canCreateComments,
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
  pendingCommentIds: Set<string>;
  commentProgress: Record<string, CommentAiProgress>;
  foregroundCommentCount: number;
  documentAiLocked: boolean;
  onStartDocumentComment: () => void;
  documentComposerOpen: boolean;
  canCreateComments: boolean;
  canManageComments: boolean;
}) {
  const { open: openComments, archived: archivedComments } =
    partitionCommentThreads(comments);

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
        {pendingCommentIds.size > 0 && (
          <span className="text-xs text-[var(--muted)]">
            {pendingCommentIds.size} processing
          </span>
        )}
      </div>

      {canCreateComments && !documentComposerOpen && (
        <div>
          <button
            type="button"
            onClick={onStartDocumentComment}
            className="secondary-button flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="h-4 w-4"
            >
              <path d="M6.75 3.75h7.5l3 3v13.5H6.75z" />
              <path d="M14.25 3.75v3h3M9.5 11h5M9.5 14h5" />
            </svg>
            Comment on whole document
          </button>
          <p className="mt-1.5 text-xs leading-5 text-[var(--muted-soft)]">
            For feedback or changes that apply across the entire draft.
          </p>
        </div>
      )}

      {documentAiLocked && (
        <div
          className="flex items-start gap-2 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)]"
          role="status"
        >
          <span className="mt-1 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--accent-strong)]" />
          <span>
            Thido is working across the whole document. Editing and new
            comments will return when this response is complete.
          </span>
        </div>
      )}

      {comments.length === 0 && foregroundCommentCount === 0 ? (
        <p className="text-xs leading-5 text-[var(--muted-soft)]">
          {documentComposerOpen
            ? "Submit your whole-document comment above."
            : canCreateComments
              ? "Select text and choose “Comment on selected text” for a specific passage, or use the whole-document action above."
              : "No comments yet."}
        </p>
      ) : openComments.length === 0 && foregroundCommentCount === 0 ? (
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
            isPending={pendingCommentIds.has(comment.id)}
            aiProgress={commentProgress[comment.id]}
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
                isPending={pendingCommentIds.has(comment.id)}
                aiProgress={commentProgress[comment.id]}
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
