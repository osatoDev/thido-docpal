import { getSchema, type JSONContent } from "@tiptap/core";
import { Node as PMNode, type Mark, type Schema } from "@tiptap/pm/model";
import { Transform } from "@tiptap/pm/transform";
import { getEditorExtensions } from "@/lib/editorExtensions";

let cachedSchema: Schema | null = null;

/** The document schema, built once from the same extensions the editor uses. */
function getDocSchema(): Schema {
  if (!cachedSchema) {
    cachedSchema = getSchema(getEditorExtensions());
  }
  return cachedSchema;
}

type CommentMarkRange = {
  from: number;
  to: number;
  text: string;
  marks: readonly Mark[];
};

/**
 * Locates the current text span carrying a `comment` mark with the given
 * commentId. Because the mark is part of the document's node structure,
 * this reflects the anchor's *current* position — even if surrounding text
 * has been edited since the comment was created. Returns null if the span
 * no longer exists (e.g. the commented text was deleted).
 */
export function findCommentMarkRange(
  content: JSONContent,
  commentId: string,
): CommentMarkRange | null {
  const schema = getDocSchema();
  const doc = PMNode.fromJSON(schema, content);
  let found: CommentMarkRange | null = null;

  doc.descendants((node, pos) => {
    if (found) return false;
    if (!node.isText) return true;
    const hasMark = node.marks.some(
      (m) => m.type.name === "comment" && m.attrs.commentId === commentId,
    );
    if (hasMark) {
      found = { from: pos, to: pos + node.nodeSize, text: node.text ?? "", marks: node.marks };
      return false;
    }
    return true;
  });

  return found;
}

/** Returns every commentId still anchored somewhere in the document. */
export function collectCommentMarkIds(content: JSONContent): Set<string> {
  const schema = getDocSchema();
  const doc = PMNode.fromJSON(schema, content);
  const ids = new Set<string>();

  doc.descendants((node) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name === "comment" && typeof mark.attrs.commentId === "string") {
        ids.add(mark.attrs.commentId);
      }
    }
  });

  return ids;
}

/**
 * Replaces the text anchored by a comment mark with new text, dropping the
 * comment mark itself (the change is now part of the document, no longer a
 * pending edit). Returns null if the anchor is no longer present.
 */
export function replaceCommentMarkText(
  content: JSONContent,
  commentId: string,
  newText: string,
): JSONContent | null {
  const schema = getDocSchema();
  const doc = PMNode.fromJSON(schema, content);
  const range = findCommentMarkRange(content, commentId);
  if (!range) return null;

  const keepMarks = range.marks.filter((m) => m.type.name !== "comment");
  const replacement = schema.text(newText, keepMarks);
  const tr = new Transform(doc).replaceWith(range.from, range.to, replacement);

  return tr.doc.toJSON() as JSONContent;
}
