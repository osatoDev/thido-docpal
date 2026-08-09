import { describe, expect, it } from "vitest";

import { isSupportedDocumentFileName } from "@/lib/documentFileTypes";

describe("supported document file names", () => {
  it("accepts Word and Markdown files case-insensitively", () => {
    expect(isSupportedDocumentFileName("draft.docx")).toBe(true);
    expect(isSupportedDocumentFileName("NOTES.MD")).toBe(true);
  });

  it("rejects unsupported and misleading extensions", () => {
    expect(isSupportedDocumentFileName("draft.pdf")).toBe(false);
    expect(isSupportedDocumentFileName("draft.md.exe")).toBe(false);
  });
});
