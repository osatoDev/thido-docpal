"use client";

import type { CommentWithReplies } from "@/lib/types";
import { CommentThread } from "./CommentThread";

export function CommentSidebar({
  comments,
  onChange,
  onDelete,
  onDocumentContentUpdated,
  pendingCommentIds,
}: {
  comments: CommentWithReplies[];
  onChange: (updated: CommentWithReplies) => void;
  onDelete: (id: string) => void;
  onDocumentContentUpdated: (content: unknown) => void;
  pendingCommentIds: Set<string>;
}) {
  return (
    <aside className="flex h-full w-full shrink-0 flex-col gap-3 overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4 lg:w-80">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Comments</h2>
        {pendingCommentIds.size > 0 && (
          <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 font-mono text-[0.6rem] text-[var(--muted)]">
            {pendingCommentIds.size} processing
          </span>
        )}
      </div>
      {comments.length === 0 ? (
        <p className="text-xs leading-5 text-[var(--muted-soft)]">
          Select text in the document and click &ldquo;Comment&rdquo; to leave
          feedback or ask the AI a question.
        </p>
      ) : (
        comments.map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            onChange={onChange}
            onDelete={onDelete}
            onDocumentContentUpdated={onDocumentContentUpdated}
            isPending={pendingCommentIds.has(comment.id)}
          />
        ))
      )}
    </aside>
  );
}
