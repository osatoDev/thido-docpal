import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";

import {
  isCommentMarkOnlyChange,
  toPublicDocumentContent,
} from "@/lib/publicDocument";

describe("public document content", () => {
  it("removes comment anchors without changing visible text or other marks", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Shared words",
              marks: [
                { type: "bold" },
                { type: "comment", attrs: { commentId: "private-id" } },
              ],
            },
          ],
        },
      ],
    };

    expect(toPublicDocumentContent(content)).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Shared words",
              marks: [{ type: "bold" }],
            },
          ],
        },
      ],
    });
    expect(content.content?.[0].content?.[0].marks).toHaveLength(2);
  });
});

describe("comment-only content changes", () => {
  const current: JSONContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Shared words" }],
      },
    ],
  };

  it("allows adding a comment mark without changing visible content", () => {
    const proposed: JSONContent = {
      ...current,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Shared words",
              marks: [{ type: "comment", attrs: { commentId: "new-id" } }],
            },
          ],
        },
      ],
    };

    expect(isCommentMarkOnlyChange(current, proposed)).toBe(true);
  });

  it("rejects visible edits and removal of existing comment marks", () => {
    const marked: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Shared words",
              marks: [{ type: "comment", attrs: { commentId: "existing-id" } }],
            },
          ],
        },
      ],
    };
    const edited: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Changed words" }],
        },
      ],
    };

    expect(isCommentMarkOnlyChange(marked, current)).toBe(false);
    expect(isCommentMarkOnlyChange(current, edited)).toBe(false);
  });
});
