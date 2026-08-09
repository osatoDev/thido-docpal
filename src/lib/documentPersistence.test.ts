import { describe, expect, it } from "vitest";

import {
  createDefaultDocumentTitle,
  DEFAULT_DOCUMENT_TITLE,
  hasMeaningfulDocumentContent,
  inferDocumentTitle,
  isDefaultDocumentTitle,
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

  it("creates a sortable UTC timestamp for a new blank document", () => {
    const title = createDefaultDocumentTitle(
      new Date("2026-08-07T08:42:31.000Z"),
    );

    expect(title).toBe("Untitled Document — 2026-08-07 08:42 UTC");
    expect(isDefaultDocumentTitle(title)).toBe(true);
    expect(shouldPromotePlaceholder({ title })).toBe(false);
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
    expect(
      hasMeaningfulDocumentContent({
        type: "doc",
        content: [{ type: "table", content: [] }],
      }),
    ).toBe(true);
  });

  it("infers an unnamed document title from its first heading", () => {
    expect(
      inferDocumentTitle({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Preface" }] },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              { type: "text", text: "  Quarterly" },
              { type: "text", text: "   plan  " },
            ],
          },
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Later" }] },
        ],
      }),
    ).toBe("Quarterly plan");
  });

  it("does not infer a title without a meaningful heading", () => {
    expect(
      inferDocumentTitle({
        type: "doc",
        content: [
          { type: "heading", content: [{ type: "text", text: "   " }] },
          { type: "paragraph", content: [{ type: "text", text: "Body" }] },
        ],
      }),
    ).toBeNull();
  });
});
