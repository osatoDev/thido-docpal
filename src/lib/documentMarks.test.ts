import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import {
  findCommentMarkRange,
  getCommentPromptContext,
  getDocumentText,
  replaceCommentMarkText,
  replaceUniqueText,
} from "@/lib/documentMarks";

describe("document comment marks", () => {
  it("extracts the full readable document for document-wide comments", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Plan" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "First " },
            {
              type: "text",
              text: "important",
              marks: [{ type: "bold" }],
            },
            { type: "text", text: " point." },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second point." }],
        },
      ],
    };

    expect(getDocumentText(content)).toBe(
      "Plan\n\nFirst important point.\n\nSecond point.",
    );
  });

  it("finds the full marked range across multiple text nodes", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Intro " },
            {
              type: "text",
              text: "first",
              marks: [{ type: "comment", attrs: { commentId: "c1" } }],
            },
            {
              type: "text",
              text: " second",
              marks: [
                { type: "bold" },
                { type: "comment", attrs: { commentId: "c1" } },
              ],
            },
            { type: "text", text: " outro" },
          ],
        },
      ],
    };

    expect(findCommentMarkRange(content, "c1")).toMatchObject({
      text: "first second",
    });
  });

  it("replaces the full marked range instead of only the first marked node", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Intro " },
            {
              type: "text",
              text: "first",
              marks: [{ type: "comment", attrs: { commentId: "c1" } }],
            },
            {
              type: "text",
              text: " second",
              marks: [{ type: "comment", attrs: { commentId: "c1" } }],
            },
            { type: "text", text: " outro" },
          ],
        },
      ],
    };

    expect(replaceCommentMarkText(content, "c1", "rewritten")).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Intro rewritten outro" }],
        },
      ],
    });
  });

  it("extracts bounded surrounding context for comment prompts", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Before context. " }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Target " },
            {
              type: "text",
              text: "sentence",
              marks: [{ type: "comment", attrs: { commentId: "c1" } }],
            },
            { type: "text", text: " here." },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "After context." }],
        },
      ],
    };

    expect(getCommentPromptContext(content, "c1")).toMatchObject({
      targetText: "sentence",
      blockText: "Target sentence here.",
      beforeText: expect.stringContaining("Before context."),
      afterText: expect.stringContaining("After context."),
    });
  });

  it("recovers a missing anchor only when the original text is unique", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Before " },
            {
              type: "text",
              text: "unique target",
              marks: [{ type: "bold" }],
            },
            { type: "text", text: " after." },
          ],
        },
      ],
    };

    expect(replaceUniqueText(content, "unique target", "replacement")).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Before " },
            {
              type: "text",
              text: "replacement",
              marks: [{ type: "bold" }],
            },
            { type: "text", text: " after." },
          ],
        },
      ],
    });
  });

  it("does not guess when missing-anchor text occurs more than once", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Same text" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Same text" }],
        },
      ],
    };

    expect(replaceUniqueText(content, "Same text", "Changed")).toBeNull();
  });
});
