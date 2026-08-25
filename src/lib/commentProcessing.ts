const DOCUMENT_WIDE_REQUESTS = [
  /\b(?:entire|whole|full)\s+(?:document|draft|piece|text)\b/i,
  /\b(?:across|throughout)\s+(?:this|the)?\s*(?:document|draft|piece|text)\b/i,
  /\b(?:document|draft|piece)[-\s]wide\b/i,
  /\b(?:document|draft)\s+overall\b/i,
  /\b(?:remove|strip|fix|change|replace|standardize|normalise|normalize|convert)\s+all\b.{0,80}\b(?:this|the)\s+(?:document|draft|piece|text)\b/i,
] as const;

/**
 * Explicit document-wide requests stay in the foreground so the user receives
 * the completed AI result with the comment-creation response.
 */
export function isDocumentWideCommentRequest(body: string) {
  return DOCUMENT_WIDE_REQUESTS.some((pattern) => pattern.test(body));
}

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
