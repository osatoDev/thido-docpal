import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";

import { toPublicDocumentContent } from "@/lib/publicDocument";

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
