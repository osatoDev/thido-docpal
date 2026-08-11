import { describe, expect, it } from "vitest";

import { countDocumentWords } from "@/lib/documentWordCount";

describe("document word count", () => {
  it("counts visible editor text and safely handles empty content", () => {
    expect(
      countDocumentWords({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Quarterly plan" }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Revenue " },
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "grew quickly.",
              },
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
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Next quarter" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe(7);
    expect(countDocumentWords(null)).toBe(0);
    expect(countDocumentWords({ type: "unknown" })).toBe(0);
  });
});
