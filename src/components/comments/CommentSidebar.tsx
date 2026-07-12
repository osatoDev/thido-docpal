"use client";

import type { CommentWithReplies } from "@/lib/types";
import { CommentThread } from "./CommentThread";

export function CommentSidebar({
  comments,
  onChange,
  onDelete,
  onDocumentContentUpdated,
}: {
  comments: CommentWithReplies[];
  onChange: (updated: CommentWithReplies) => void;
  onDelete: (id: string) => void;
  onDocumentContentUpdated: (content: unknown) => void;
}) {
  return (
    <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l p-4">
      <h2 className="text-sm font-semibold text-gray-700">Comments</h2>
      {comments.length === 0 ? (
        <p className="text-xs text-gray-400">
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
          />
        ))
      )}
    </aside>
  );
}
