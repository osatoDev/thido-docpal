import { describe, expect, it } from "vitest";

import {
  isSafeDocumentLink,
  normalizeDocumentLink,
} from "@/lib/documentLinks";

describe("document links", () => {
  it("normalizes web addresses and email addresses", () => {
    expect(normalizeDocumentLink("example.com/path")).toBe(
      "https://example.com/path",
    );
    expect(normalizeDocumentLink("writer@example.com")).toBe(
      "mailto:writer@example.com",
    );
  });

  it("allows only explicit HTTP(S) and email links in saved content", () => {
    expect(isSafeDocumentLink("https://example.com")).toBe(true);
    expect(isSafeDocumentLink("mailto:writer@example.com")).toBe(true);
    expect(isSafeDocumentLink("javascript:alert(1)")).toBe(false);
    expect(isSafeDocumentLink("data:text/html,unsafe")).toBe(false);
    expect(isSafeDocumentLink("/relative/path")).toBe(false);
  });
});
