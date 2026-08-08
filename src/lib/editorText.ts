import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export type DocumentTextRange = {
  from: number;
  to: number;
};

export type TextCounts = {
  words: number;
  characters: number;
  charactersWithoutSpaces: number;
};

export type DocumentInsights = {
  sentences: number;
  paragraphs: number;
  headings: number;
  tables: number;
  images: number;
  estimatedReadingMinutes: number;
  estimatedPages: number;
};

const DOCUMENT_BOUNDARY = "\u0000";

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findDocumentTextMatches(
  doc: ProseMirrorNode,
  query: string,
  matchCase = false,
): DocumentTextRange[] {
  if (!query) return [];

  let indexedText = "";
  const positions: Array<number | null> = [];
  let previousTextEnd: number | null = null;

  doc.descendants((node, position) => {
    if (!node.isText || !node.text) return;

    if (previousTextEnd !== null && position > previousTextEnd) {
      indexedText += DOCUMENT_BOUNDARY;
      positions.push(null);
    }

    indexedText += node.text;
    for (let offset = 0; offset < node.text.length; offset += 1) {
      positions.push(position + offset);
    }
    previousTextEnd = position + node.text.length;
  });

  const flags = matchCase ? "gu" : "giu";
  const pattern = new RegExp(escapeRegularExpression(query), flags);
  const matches: DocumentTextRange[] = [];

  for (const match of indexedText.matchAll(pattern)) {
    if (match.index === undefined || match[0].length === 0) continue;
    const start = positions[match.index];
    const end = positions[match.index + match[0].length - 1];
    if (start === null || start === undefined || end === null || end === undefined) {
      continue;
    }
    matches.push({ from: start, to: end + 1 });
  }

  return matches;
}

export function getDocumentText(
  doc: ProseMirrorNode,
  from = 0,
  to = doc.content.size,
) {
  return doc.textBetween(from, to, " ", " ");
}

export function countText(value: string): TextCounts {
  return {
    words: value.match(/\S+/gu)?.length ?? 0,
    characters: value.length,
    charactersWithoutSpaces: value.replace(/\s/gu, "").length,
  };
}

export function getDocumentInsights(doc: ProseMirrorNode): DocumentInsights {
  const text = getDocumentText(doc).trim();
  const words = countText(text).words;
  let paragraphs = 0;
  let headings = 0;
  let tables = 0;
  let images = 0;

  doc.descendants((node) => {
    if (node.type.name === "paragraph") paragraphs += 1;
    if (node.type.name === "heading") headings += 1;
    if (node.type.name === "table") tables += 1;
    if (node.type.name === "image") images += 1;
  });

  const sentences = text
    ? (text.match(/[^.!?]+(?:[.!?]+|$)/gu)?.filter((sentence) =>
        /\p{L}|\p{N}/u.test(sentence),
      ).length ?? 0)
    : 0;

  return {
    sentences,
    paragraphs,
    headings,
    tables,
    images,
    estimatedReadingMinutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / 200)),
    estimatedPages: words === 0 ? 0 : Math.max(1, Math.ceil(words / 500)),
  };
}
