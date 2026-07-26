import type { JSONContent } from "@tiptap/react";

/**
 * Removes Thido-private comment anchors before document JSON crosses the
 * public share boundary. Comment bodies live separately in PostgreSQL, but
 * the marks also contain internal comment ids and should not be exposed.
 */
export function toPublicDocumentContent(content: JSONContent): JSONContent {
  const publicContent: JSONContent = { ...content };

  if (content.marks) {
    publicContent.marks = content.marks
      .filter((mark) => mark.type !== "comment")
      .map((mark) => ({ ...mark }));
  }

  if (content.content) {
    publicContent.content = content.content.map(toPublicDocumentContent);
  }

  return publicContent;
}
