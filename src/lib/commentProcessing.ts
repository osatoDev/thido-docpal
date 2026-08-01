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

export type AiCommentMode = "PROPOSE" | "AUTO" | "AUTO_APPLY";
export type AiSuggestionAction = "apply" | "propose";

/**
 * Explicit preferences always win. Auto follows the model's structured
 * judgment about whether the prompt is a direct edit instruction, but never
 * applies anything for a collaborator who cannot edit the document.
 */
export function shouldApplyCommentSuggestion({
  mode,
  suggestionAction,
  allowAutoApply,
}: {
  mode: AiCommentMode;
  suggestionAction: AiSuggestionAction;
  allowAutoApply: boolean;
}) {
  if (!allowAutoApply || mode === "PROPOSE") return false;
  return mode === "AUTO_APPLY" || suggestionAction === "apply";
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
