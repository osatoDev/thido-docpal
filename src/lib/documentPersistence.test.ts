import { describe, expect, it } from "vitest";

import {
  DEFAULT_DOCUMENT_TITLE,
  hasMeaningfulDocumentContent,
  shouldPromotePlaceholder,
} from "@/lib/documentPersistence";

describe("document persistence", () => {
  it("keeps an untouched editor document as a placeholder", () => {
    expect(
      shouldPromotePlaceholder({
        title: DEFAULT_DOCUMENT_TITLE,
        content: {
          type: "doc",
          content: [{ type: "paragraph" }],
        },
      }),
    ).toBe(false);
  });

  it("ignores whitespace-only text and empty structural nodes", () => {
    expect(
      hasMeaningfulDocumentContent({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "   " }],
          },
          { type: "paragraph" },
        ],
      }),
    ).toBe(false);
  });

  it("promotes a placeholder after a custom title or visible text is saved", () => {
    expect(shouldPromotePlaceholder({ title: "Quarterly plan" })).toBe(true);
    expect(
      shouldPromotePlaceholder({
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "First draft" }],
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it("treats a visible non-text document element as meaningful content", () => {
    expect(
      hasMeaningfulDocumentContent({
        type: "doc",
        content: [{ type: "horizontalRule" }],
      }),
    ).toBe(true);
  });
});
