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

export type CommentPromptContext = {
  afterText: string;
  beforeText: string;
  blockText: string;
  targetText: string;
};

/** Returns the readable text of the whole editor document. */
export function getDocumentText(content: JSONContent) {
  const schema = getDocSchema();
  const doc = PMNode.fromJSON(schema, content);
  return doc.textBetween(0, doc.content.size, "\n\n", " ").trim();
}

function trimLeading(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(text.length - maxLength).trimStart();
}

function trimTrailing(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd();
}

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
  let firstFrom: number | null = null;
  let lastTo: number | null = null;
  let firstMarks: readonly Mark[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    const hasMark = node.marks.some(
      (m) => m.type.name === "comment" && m.attrs.commentId === commentId,
    );
    if (hasMark) {
      if (firstFrom === null) {
        firstFrom = pos;
        firstMarks = node.marks;
      }
      lastTo = pos + node.nodeSize;
    }
    return true;
  });

  if (firstFrom === null || lastTo === null) {
    return null;
  }

  return {
    from: firstFrom,
    to: lastTo,
    text: doc.textBetween(firstFrom, lastTo, "\n\n", " "),
    marks: firstMarks,
  };
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

/**
 * Recovers a legacy suggestion whose comment mark was never persisted.
 * Replacement is deliberately conservative: the original text must occur
 * exactly once in one text block, so accepting can never guess which passage
 * the user intended to change.
 */
export function replaceUniqueText(
  content: JSONContent,
  originalText: string,
  newText: string,
): JSONContent | null {
  if (!originalText) return null;

  const schema = getDocSchema();
  const doc = PMNode.fromJSON(schema, content);
  const matches: Array<{ from: number; to: number; marks: readonly Mark[] }> = [];

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;

    let blockText = "";
    const positions: number[] = [];
    const marksAtPositions: Array<readonly Mark[]> = [];

    node.forEach((child, offset) => {
      if (!child.isText || !child.text) {
        // Do not allow a fallback match to cross an inline atom such as a
        // hard break, because its textual representation is ambiguous.
        blockText += "\u0000";
        positions.push(-1);
        marksAtPositions.push([]);
        return;
      }

      for (let index = 0; index < child.text.length; index += 1) {
        blockText += child.text[index];
        positions.push(pos + 1 + offset + index);
        marksAtPositions.push(child.marks);
      }
    });

    let searchFrom = 0;
    while (searchFrom <= blockText.length - originalText.length) {
      const index = blockText.indexOf(originalText, searchFrom);
      if (index === -1) break;

      const matchedPositions = positions.slice(index, index + originalText.length);
      const from = matchedPositions[0];
      const to = matchedPositions.at(-1);
      const isContiguous = matchedPositions.every(
        (position, positionIndex) =>
          position >= 0 &&
          (positionIndex === 0 ||
            position === matchedPositions[positionIndex - 1] + 1),
      );

      if (isContiguous && from !== undefined && to !== undefined) {
        matches.push({
          from,
          to: to + 1,
          marks: marksAtPositions[index],
        });
      }

      searchFrom = index + 1;
    }

    return false;
  });

  if (matches.length !== 1) return null;

  const [match] = matches;
  const keepMarks = match.marks.filter((mark) => mark.type.name !== "comment");
  const replacement = schema.text(newText, keepMarks);
  const tr = new Transform(doc).replaceWith(match.from, match.to, replacement);

  return tr.doc.toJSON() as JSONContent;
}

export function getCommentPromptContext(
  content: JSONContent,
  commentId: string,
): CommentPromptContext | null {
  const schema = getDocSchema();
  const doc = PMNode.fromJSON(schema, content);
  const range = findCommentMarkRange(content, commentId);
  if (!range) return null;

  const $from = doc.resolve(range.from);
  const blockDepth = $from.depth;
  const blockStart = $from.start(blockDepth);
  const blockEnd = $from.end(blockDepth);
  const beforeStart = Math.max(0, range.from - 320);
  const afterEnd = Math.min(doc.content.size, range.to + 320);

  return {
    targetText: range.text.trim(),
    beforeText: trimLeading(
      doc.textBetween(beforeStart, range.from, "\n\n", " ").trim(),
      280,
    ),
    afterText: trimTrailing(
      doc.textBetween(range.to, afterEnd, "\n\n", " ").trim(),
      280,
    ),
    blockText: doc.textBetween(blockStart, blockEnd, "\n\n", " ").trim(),
  };
}
