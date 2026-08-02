import { describe, expect, it } from "vitest";

import { sanitizeImportedWordHtml } from "@/lib/documentImport";

describe("Word import sanitization", () => {
  it("keeps supported document markup and Thido-owned images", () => {
    const html = sanitizeImportedWordHtml(
      '<h2>Heading</h2><p><strong>Safe</strong></p><img src="/api/document-images/image-1" alt="Diagram">',
    );

    expect(html).toContain("<h2>Heading</h2>");
    expect(html).toContain("<strong>Safe</strong>");
    expect(html).toContain('/api/document-images/image-1');
  });

  it("removes executable markup and non-Thido image sources", () => {
    const html = sanitizeImportedWordHtml(
      '<script>alert(1)</script><p onclick="alert(2)">Text</p><img src="https://tracker.example/pixel.png">',
    );

    expect(html).toBe("<p>Text</p>");
  });
});
