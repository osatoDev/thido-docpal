import type { JSONContent } from "@tiptap/react";

import { collectCommentMarkIds } from "@/lib/documentMarks";

/**
 * Removes Thido-private comment anchors before document JSON crosses the
 * public share boundary. Comment bodies live separately in PostgreSQL, but
 * the marks also contain internal comment ids and should not be exposed.
 */
export function toPublicDocumentContent(
  content: JSONContent,
  shareToken?: string,
): JSONContent {
  const publicContent: JSONContent = { ...content };

  if (
    shareToken &&
    content.type === "image" &&
    typeof content.attrs?.src === "string" &&
    content.attrs.src.startsWith("/api/document-images/")
  ) {
    publicContent.attrs = {
      ...content.attrs,
      src: `${content.attrs.src}?share=${encodeURIComponent(shareToken)}`,
    };
  }

  if (content.marks) {
    const marks = content.marks
      .filter((mark) => mark.type !== "comment")
      .map((mark) => ({ ...mark }));
    if (marks.length > 0) {
      publicContent.marks = marks;
    } else {
      delete publicContent.marks;
    }
  }

  if (content.content) {
    publicContent.content = content.content.map((child) =>
      toPublicDocumentContent(child, shareToken),
    );
  }

  return publicContent;
}

/**
 * Comment-only collaborators may add anchors without gaining an indirect way
 * to edit visible content or remove anchors that are already persisted.
 */
export function isCommentMarkOnlyChange(
  current: JSONContent,
  proposed: JSONContent,
) {
  if (
    JSON.stringify(toPublicDocumentContent(current)) !==
    JSON.stringify(toPublicDocumentContent(proposed))
  ) {
    return false;
  }

  const proposedMarkIds = collectCommentMarkIds(proposed);
  return Array.from(collectCommentMarkIds(current)).every((id) =>
    proposedMarkIds.has(id),
  );
}
