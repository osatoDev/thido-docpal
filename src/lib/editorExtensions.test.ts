import { describe, expect, it } from "vitest";
import { generateHTML, generateJSON } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/core";

import { transformTextCase } from "@/components/editor/extensions/TextCase";
import { slugifyHeading } from "@/components/editor/extensions/HeadingAnchors";
import { normalizeCustomBulletGlyph } from "@/components/editor/extensions/StyledBulletList";
import { getDocumentSideMarginMillimeters } from "@/components/editor/extensions/DocumentPreferences";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { preserveDocumentPreferences } from "@/lib/markdownToTiptap";

describe("styled bullet lists", () => {
  it("renders a saved bullet style into document HTML", () => {
    const html = generateHTML(
      {
        type: "doc",
        content: [
          {
            type: "bulletList",
            attrs: { bulletStyle: "square" },
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Square item" }],
                  },
                ],
              },
            ],
          },
        ],
      },
      getEditorExtensions(),
    );

    expect(html).toContain('data-bullet-style="square"');
    expect(html).toContain("list-style-type: square");
  });

  it("parses supported styles and rejects unsupported list-style values", () => {
    const supported = generateJSON(
      '<ul style="list-style-type: circle"><li><p>Circle item</p></li></ul>',
      getEditorExtensions(),
    );
    const unsupported = generateJSON(
      '<ul data-bullet-style="symbols(unsafe)"><li><p>Item</p></li></ul>',
      getEditorExtensions(),
    );

    expect(supported.content?.[0].attrs?.bulletStyle).toBe("circle");
    expect(unsupported.content?.[0].attrs?.bulletStyle).toBe("disc");
  });

  it("round-trips preset and safe custom bullet glyphs", () => {
    const html = generateHTML(
      {
        type: "doc",
        content: [
          {
            type: "bulletList",
            attrs: { bulletStyle: "star" },
            content: [
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Important" }] }],
              },
            ],
          },
          {
            type: "bulletList",
            attrs: { bulletStyle: "custom", bulletGlyph: "❖" },
            content: [
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Custom" }] }],
              },
            ],
          },
        ],
      },
      getEditorExtensions(),
    );
    const parsed = generateJSON(html, getEditorExtensions());

    expect(html).toContain('data-bullet-style="star"');
    expect(html).toContain('data-bullet-style="custom"');
    expect(html).toContain('data-bullet-glyph="❖"');
    expect(parsed.content?.[1].attrs).toMatchObject({
      bulletStyle: "custom",
      bulletGlyph: "❖",
    });
    expect(normalizeCustomBulletGlyph("A")).toBeNull();
    expect(normalizeCustomBulletGlyph(";}")).toBeNull();
    expect(normalizeCustomBulletGlyph("✦")).toBe("✦");
  });
});

describe("priority-one document structures", () => {
  it("preserves safe links while dropping unsafe link marks", () => {
    const content = generateJSON(
      '<p><a href="https://example.com/path">Safe</a> <a href="javascript:alert(1)">Unsafe</a></p>',
      getEditorExtensions(),
    );

    expect(content.content?.[0].content?.[0].marks?.[0]).toMatchObject({
      type: "link",
      attrs: { href: "https://example.com/path" },
    });
    const unsafeText = content.content?.[0].content?.find((node: JSONContent) =>
      node.text?.includes("Unsafe"),
    );
    expect(unsafeText?.marks).toBeUndefined();
  });

  it("round-trips task lists and accessible tables", () => {
    const content = generateJSON(
      [
        '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Done</p></li></ul>',
        "<table><tbody><tr><th><p>Name</p></th><th><p>Status</p></th></tr><tr><td><p>Draft</p></td><td><p>Ready</p></td></tr></tbody></table>",
      ].join(""),
      getEditorExtensions(),
    );
    const html = generateHTML(content, getEditorExtensions());

    expect(content.content?.[0]).toMatchObject({
      type: "taskList",
      attrs: { taskStyle: "strike" },
      content: [{ type: "taskItem", attrs: { checked: true } }],
    });
    expect(content.content?.[1].type).toBe("table");
    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('data-task-style="strike"');
    expect(html).toContain("<th");
    expect(html).toContain("<td");
  });

  it("round-trips both checklist completion styles", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "taskList",
          attrs: { taskStyle: "strike" },
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [{ type: "paragraph", content: [{ type: "text", text: "Done" }] }],
            },
          ],
        },
        {
          type: "taskList",
          attrs: { taskStyle: "plain" },
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "Open" }] }],
            },
          ],
        },
      ],
    };

    const html = generateHTML(content, getEditorExtensions());
    const parsed = generateJSON(html, getEditorExtensions());
    expect(html).toContain('data-task-style="strike"');
    expect(html).toContain('data-task-style="plain"');
    expect(
      parsed.content?.map((node: JSONContent) => node.attrs?.taskStyle),
    ).toEqual(["strike", "plain"]);
  });

  it("round-trips expanded formatting, alignment, indentation, and page breaks", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center", textIndent: 2 },
          content: [
            { type: "text", text: "Under", marks: [{ type: "underline" }] },
            { type: "text", text: " mark", marks: [{ type: "highlight" }] },
            { type: "text", text: " x", marks: [{ type: "superscript" }] },
            { type: "text", text: " 2", marks: [{ type: "subscript" }] },
            { type: "text", text: " code", marks: [{ type: "code" }] },
          ],
        },
        {
          type: "codeBlock",
          attrs: { language: null },
          content: [{ type: "text", text: "const ready = true;" }],
        },
        { type: "pageBreak" },
        { type: "paragraph" },
      ],
    };

    const html = generateHTML(content, getEditorExtensions());
    const parsed = generateJSON(html, getEditorExtensions());

    expect(html).toContain("text-align: center");
    expect(html).toContain('data-text-indent="2"');
    expect(html).toContain("margin-left: 4rem");
    expect(html).toContain("<u>Under</u>");
    expect(html).toContain("<mark> mark</mark>");
    expect(html).toContain("<sup> x</sup>");
    expect(html).toContain("<sub> 2</sub>");
    expect(html).toContain("<code> code</code>");
    expect(html).toContain("<pre><code>const ready = true;</code></pre>");
    expect(html).toContain('data-type="page-break"');
    expect(parsed.content?.[0].attrs).toMatchObject({
      textAlign: "center",
      textIndent: 2,
    });
    expect(parsed.content?.[2].type).toBe("pageBreak");
  });

  it("round-trips advanced text styles, paragraph spacing, and deeper headings", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: {
            level: 6,
            lineHeight: 1.5,
            spaceBefore: 0.75,
            spaceAfter: 0,
          },
          content: [
            {
              type: "text",
              text: "Styled heading",
              marks: [
                {
                  type: "richTextStyle",
                  attrs: {
                    fontFamily: "Arial, sans-serif",
                    fontSize: 14,
                    color: "#175cd3",
                  },
                },
                { type: "highlight", attrs: { color: "#bbf7d0" } },
              ],
            },
          ],
        },
      ],
    };

    const html = generateHTML(content, getEditorExtensions());
    const parsed = generateJSON(html, getEditorExtensions());

    expect(html).toContain("<h6");
    expect(html).toContain("line-height: 1.5");
    expect(html).toContain("margin-top: 0.75rem");
    expect(html).toContain("font-family: Arial, sans-serif");
    expect(html).toContain("font-size: 14pt");
    expect(html).toContain("color: #175cd3");
    expect(html).toContain("background-color: #bbf7d0");
    expect(parsed.content?.[0]).toMatchObject({
      type: "heading",
      attrs: {
        level: 6,
        lineHeight: 1.5,
        spaceBefore: 0.75,
        spaceAfter: 0,
      },
    });
    expect(parsed.content?.[0].content?.[0].marks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "richTextStyle",
          attrs: {
            fontFamily: "Arial, sans-serif",
            fontSize: 14,
            color: "#175cd3",
          },
        }),
        expect.objectContaining({
          type: "highlight",
          attrs: { color: "#bbf7d0" },
        }),
      ]),
    );
  });

  it("round-trips document preferences, section links, contents, and footnotes", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "documentPreferences",
          attrs: {
            language: "de-DE",
            spellcheck: false,
            direction: "rtl",
            appearance: "editorial",
            sideMargin: "wide",
          },
        },
        {
          type: "tableOfContents",
          attrs: {
            entries: [{ id: "uberblick", level: 2, text: "Überblick" }],
          },
        },
        {
          type: "heading",
          attrs: {
            level: 2,
            headingId: "uberblick",
            outlineHidden: true,
          },
          content: [{ type: "text", text: "Überblick" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "A claim" },
            {
              type: "footnoteReference",
              attrs: { footnoteId: "note-1", number: 1 },
            },
          ],
        },
        {
          type: "footnote",
          attrs: { footnoteId: "note-1", number: 1 },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Supporting source" }],
            },
          ],
        },
      ],
    };

    const html = generateHTML(content, getEditorExtensions());
    const parsed = generateJSON(html, getEditorExtensions());

    expect(html).toContain('data-language="de-DE"');
    expect(html).toContain('data-direction="rtl"');
    expect(html).toContain('data-appearance="editorial"');
    expect(html).toContain('data-side-margin="wide"');
    expect(html).toContain('id="uberblick"');
    expect(html).toContain('data-outline-hidden="true"');
    expect(html).toContain('data-type="table-of-contents"');
    expect(html).not.toContain(' entries="');
    expect(html).toContain('href="#uberblick"');
    expect(html).toContain('data-type="footnote-reference"');
    expect(html).not.toContain(' footnoteid="');
    expect(html).not.toContain(' number="');
    expect(html).toContain('href="#footnote-note-1"');
    expect(html).toContain('href="#footnote-ref-note-1"');
    expect(parsed.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "documentPreferences",
          attrs: expect.objectContaining({
            language: "de-DE",
            spellcheck: false,
            direction: "rtl",
            appearance: "editorial",
            sideMargin: "wide",
          }),
        }),
        expect.objectContaining({
          type: "heading",
          attrs: expect.objectContaining({
            headingId: "uberblick",
            outlineHidden: true,
          }),
        }),
        expect.objectContaining({
          type: "footnote",
          attrs: expect.objectContaining({ footnoteId: "note-1", number: 1 }),
        }),
      ]),
    );
  });

  it("keeps page style and document preferences through an AI rewrite", () => {
    const rewritten = preserveDocumentPreferences(
      {
        type: "doc",
        content: [
          {
            type: "documentPreferences",
            attrs: {
              language: "en-GB",
              spellcheck: true,
              direction: "ltr",
              appearance: "warm",
              sideMargin: "narrow",
            },
          },
          { type: "paragraph", content: [{ type: "text", text: "Old" }] },
        ],
      },
      {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "New" }] },
        ],
      },
    );

    expect(rewritten.content?.[0]).toMatchObject({
      type: "documentPreferences",
      attrs: {
        appearance: "warm",
        language: "en-GB",
        sideMargin: "narrow",
      },
    });
    expect(rewritten.content?.[1]?.textContent).toBeUndefined();
    expect(rewritten.content?.[1]?.content?.[0]?.text).toBe("New");
  });

  it("normalizes side margins for export and defaults older documents", () => {
    expect(getDocumentSideMarginMillimeters(null)).toBe(19.05);
    expect(
      getDocumentSideMarginMillimeters({
        content: [
          {
            type: "documentPreferences",
            attrs: { sideMargin: "narrow" },
          },
        ],
      }),
    ).toBe(12.7);
    expect(
      getDocumentSideMarginMillimeters({
        content: [
          {
            type: "documentPreferences",
            attrs: { sideMargin: "unsafe-value" },
          },
        ],
      }),
    ).toBe(19.05);
  });

  it("round-trips named bookmarks as safe internal destinations", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Start " },
            {
              type: "bookmark",
              attrs: { bookmarkId: "mark-3", label: "Key decision" },
            },
            { type: "text", text: " here" },
          ],
        },
      ],
    };

    const html = generateHTML(content, getEditorExtensions());
    const parsed = generateJSON(html, getEditorExtensions());

    expect(html).toContain('data-type="bookmark"');
    expect(html).toContain('data-bookmark-id="mark-3"');
    expect(html).toContain('id="bookmark-mark-3"');
    expect(html).toContain('data-label="Key decision"');
    expect(parsed.content?.[0].content?.[1]).toMatchObject({
      type: "bookmark",
      attrs: { bookmarkId: "mark-3", label: "Key decision" },
    });
  });
});

describe("heading anchors", () => {
  it("creates safe, readable slugs with a non-numeric prefix", () => {
    expect(slugifyHeading("Résumé & next steps")).toBe("resume-next-steps");
    expect(slugifyHeading("2026 roadmap")).toBe("section-2026-roadmap");
    expect(slugifyHeading("🔥")).toBe("section");
  });
});

describe("capitalization commands", () => {
  it("supports upper, lower, and title case", () => {
    expect(transformTextCase("Thido drafts", "uppercase")).toBe(
      "THIDO DRAFTS",
    );
    expect(transformTextCase("Thido DRAFTS", "lowercase")).toBe(
      "thido drafts",
    );
    expect(transformTextCase("a BETTER client's draft", "title")).toBe(
      "A Better Client's Draft",
    );
    expect(transformTextCase("hELLO WORLD. nEXT STEP!", "sentence")).toBe(
      "Hello world. Next step!",
    );
    expect(transformTextCase("Thido 2.0", "toggle")).toBe("tHIDO 2.0");
  });
});
