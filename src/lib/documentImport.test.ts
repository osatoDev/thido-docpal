import { describe, expect, it } from "vitest";

import { sanitizeImportedWordHtml } from "@/lib/documentImport";

describe("Word import sanitization", () => {
  it("keeps supported document markup and Thido-owned images", () => {
    const html = sanitizeImportedWordHtml(
      '<h2>Heading</h2><p><strong>Safe</strong> <a href="https://example.com">link</a></p><table><tr><th>Name</th></tr><tr><td>Draft</td></tr></table><img src="/api/document-images/image-1" alt="Diagram">',
    );

    expect(html).toContain("<h2>Heading</h2>");
    expect(html).toContain("<strong>Safe</strong>");
    expect(html).toContain('<a href="https://example.com">link</a>');
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Name</th>");
    expect(html).toContain('/api/document-images/image-1');
  });

  it("removes executable markup and non-Thido image sources", () => {
    const html = sanitizeImportedWordHtml(
      '<script>alert(1)</script><p onclick="alert(2)"><a href="javascript:alert(3)">Text</a></p><img src="https://tracker.example/pixel.png">',
    );

    expect(html).toBe("<p><a>Text</a></p>");
  });
});
