export function partitionCommentThreads<
  CommentThread extends { status: "OPEN" | "RESOLVED" },
>(comments: CommentThread[]) {
  const open: CommentThread[] = [];
  const archived: CommentThread[] = [];

  for (const comment of comments) {
    if (comment.status === "RESOLVED") {
      archived.push(comment);
    } else {
      open.push(comment);
    }
  }

  return { open, archived };
}

/**
 * User comments stay queued until an editor explicitly asks Thido to action
 * the document's open comments as one coherent revision.
 */
export function isCommentQueuedForBatch(comment: {
  aiStatus: "NOT_REQUESTED" | "PENDING" | "SUCCEEDED" | "FAILED";
  authorType: "USER" | "AI";
  status: "OPEN" | "RESOLVED";
  suggestion?: unknown | null;
}) {
  return (
    comment.authorType === "USER" &&
    comment.status === "OPEN" &&
    (comment.aiStatus === "NOT_REQUESTED" || comment.aiStatus === "FAILED") &&
    !comment.suggestion
  );
}
