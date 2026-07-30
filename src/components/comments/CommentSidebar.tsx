"use client";

import type { CommentAiProgress, CommentWithReplies } from "@/lib/types";
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
  canManageComments,
}: {
  comments: CommentWithReplies[];
  onChange: (updated: CommentWithReplies) => void;
  onDelete: (id: string) => void;
  onDocumentContentUpdated: (content: unknown) => void;
  pendingCommentIds: Set<string>;
  commentProgress: Record<string, CommentAiProgress>;
  foregroundCommentCount: number;
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

      {foregroundCommentCount > 0 && (
        <div
          className="flex items-start gap-2 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)]"
          role="status"
        >
          <span className="mt-1 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--accent-strong)]" />
          <span>
            Thido is working on a document-wide comment. It will appear when
            the response is complete.
          </span>
        </div>
      )}

      {comments.length === 0 && foregroundCommentCount === 0 ? (
        <p className="text-xs leading-5 text-[var(--muted-soft)]">
          Select text in the document and click &ldquo;Comment&rdquo; to leave
          feedback or ask the AI a question.
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
              />
            ))}
          </div>
        </details>
      )}
    </aside>
  );
}
