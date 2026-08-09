import { describe, expect, it } from "vitest";

import { sanitizeImportedWordHtml } from "@/lib/documentImport";
import { markdownToTiptapJSON } from "@/lib/markdownToTiptap";

describe("Word import sanitization", () => {
  it("keeps supported document markup and Thido-owned images", () => {
    const html = sanitizeImportedWordHtml(
      '<h2>Heading</h2><h6>Detail</h6><p><strong>Safe</strong> <u>underlined</u> <mark>highlighted</mark> x<sup>2</sup> H<sub>2</sub>O <a href="https://example.com">link</a></p><table><tr><th>Name</th></tr><tr><td>Draft</td></tr></table><img src="/api/document-images/image-1" alt="Diagram">',
    );

    expect(html).toContain("<h2>Heading</h2>");
    expect(html).toContain("<h6>Detail</h6>");
    expect(html).toContain("<strong>Safe</strong>");
    expect(html).toContain("<u>underlined</u>");
    expect(html).toContain("<mark>highlighted</mark>");
    expect(html).toContain("<sup>2</sup>");
    expect(html).toContain("<sub>2</sub>");
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

  it("turns sanitized Markdown into editable Thido document JSON", async () => {
    const content = await markdownToTiptapJSON(
      "# Project plan\n\nSafe **body**.\n\n<script>alert('no')</script>",
      { sanitize: true },
    );

    expect(content.content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Project plan" }],
    });
    expect(JSON.stringify(content)).not.toContain("alert");
  });
});
