import { describe, expect, it } from "vitest";

import {
  documentEditPath,
  documentTitleSlug,
  MAX_DOCUMENT_TITLE_SLUG_LENGTH,
} from "@/lib/documentUrls";

describe("document title URLs", () => {
  it("creates readable, URL-safe slugs", () => {
    expect(documentTitleSlug("  Client’s Q3 Proposal!  ")).toBe(
      "clients-q3-proposal",
    );
    expect(documentTitleSlug("Überblick & nächste Schritte")).toBe(
      "uberblick-nachste-schritte",
    );
    expect(documentTitleSlug("東京 2026")).toBe("東京-2026");
  });

  it("keeps stable ids authoritative and omits unusable slugs", () => {
    expect(documentEditPath("doc/123", "Project plan")).toBe(
      "/documents/doc%2F123/edit/project-plan",
    );
    expect(documentEditPath("doc-123", "🔥✨")).toBe(
      "/documents/doc-123/edit",
    );
    expect(documentEditPath("doc-123", "Untitled Document")).toBe(
      "/documents/doc-123/edit",
    );
    expect(
      documentEditPath(
        "doc-123",
        "Untitled Document — 2026-08-11 19:20 UTC",
      ),
    ).toBe("/documents/doc-123/edit");
  });

  it("bounds slugs without splitting Unicode code points", () => {
    const slug = documentTitleSlug("界".repeat(100));
    expect(Array.from(slug)).toHaveLength(MAX_DOCUMENT_TITLE_SLUG_LENGTH);
  });
});
