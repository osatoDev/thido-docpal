import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { getEditorExtensions } from "@/lib/editorExtensions";
import {
  countText,
  findDocumentTextMatches,
  getDocumentInsights,
  getDocumentText,
} from "@/lib/editorText";

const schema = getSchema(getEditorExtensions());

describe("editor text utilities", () => {
  it("finds literal text across inline marks without crossing block boundaries", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Alpha " },
            { type: "text", marks: [{ type: "bold" }], text: "beta" },
            { type: "text", text: " alpha." },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "Alpha" }] },
      ],
    });

    expect(findDocumentTextMatches(doc, "alpha")).toEqual([
      { from: 1, to: 6 },
      { from: 12, to: 17 },
      { from: 20, to: 25 },
    ]);
    expect(findDocumentTextMatches(doc, "Alpha beta")).toEqual([
      { from: 1, to: 11 },
    ]);
    expect(findDocumentTextMatches(doc, "alpha", true)).toEqual([
      { from: 12, to: 17 },
    ]);
    expect(findDocumentTextMatches(doc, "alpha.Alpha")).toEqual([]);
  });

  it("counts document text and a selected range", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "One two" }] },
        { type: "paragraph", content: [{ type: "text", text: "three" }] },
      ],
    });

    expect(getDocumentText(doc)).toBe("One two three");
    expect(countText(getDocumentText(doc))).toEqual({
      words: 3,
      characters: 13,
      charactersWithoutSpaces: 11,
    });
    expect(countText(getDocumentText(doc, 1, 8))).toMatchObject({ words: 2 });
  });

  it("summarizes document structure and reading estimates", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Overview" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "First sentence. Second sentence!" },
          ],
        },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [{ type: "paragraph" }],
                },
              ],
            },
          ],
        },
        {
          type: "image",
          attrs: { src: "/api/document-images/image-id", alt: "Chart" },
        },
      ],
    });

    expect(getDocumentInsights(doc)).toEqual({
      sentences: 2,
      paragraphs: 2,
      headings: 1,
      tables: 1,
      images: 1,
      estimatedReadingMinutes: 1,
      estimatedPages: 1,
    });
  });
});
