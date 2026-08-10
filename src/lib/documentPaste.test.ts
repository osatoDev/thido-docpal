import { generateHTML, generateJSON } from "@tiptap/html/server";
import { Window } from "happy-dom";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  hasHtmlTable,
  isGoogleDocsClipboardHtml,
  normalizeGoogleDocsPastedHtml,
} from "@/components/editor/extensions/GoogleDocsPaste";
import { getEditorExtensions } from "@/lib/editorExtensions";

const GOOGLE_DOCS_HTML = `
  <meta charset="utf-8">
  <b id="docs-internal-guid-example" style="font-weight: normal">
    <h2 style="line-height: 1.38; margin-top: 12pt; margin-bottom: 6pt; text-align: center">
      <span style="font-family: Arial, sans-serif; font-size: 18pt; color: rgb(17, 85, 204); font-weight: 700">Project brief</span>
    </h2>
    <p style="line-height: 150%; margin-top: 0pt; margin-bottom: 8pt">
      <span style="font-family: Georgia; font-size: 11pt; color: rgb(34, 34, 34); background-color: rgb(255, 242, 204); font-style: italic; text-decoration: underline">Highlighted introduction</span>
      <span style="vertical-align: super">2</span>
    </p>
    <ul style="list-style-type: square"><li><p><span>First item</span></p></li></ul>
    <table><tbody><tr><th><p>Name</p></th><th><p>Status</p></th></tr><tr><td><p>Draft</p></td><td><p>Ready</p></td></tr></tbody></table>
  </b>
`;

beforeAll(() => {
  const window = new Window();
  vi.stubGlobal("DOMParser", window.DOMParser);
  vi.stubGlobal("HTMLElement", window.HTMLElement);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("Google Docs clipboard compatibility", () => {
  it("recognizes Google Docs HTML and rich HTML tables", () => {
    expect(isGoogleDocsClipboardHtml(GOOGLE_DOCS_HTML)).toBe(true);
    expect(isGoogleDocsClipboardHtml("<p>Ordinary HTML</p>")).toBe(false);
    expect(hasHtmlTable(GOOGLE_DOCS_HTML)).toBe(true);
    expect(hasHtmlTable("<p>Name\tStatus</p>")).toBe(false);
  });

  it("preserves common Google Docs structure and presentation", () => {
    const normalized = normalizeGoogleDocsPastedHtml(GOOGLE_DOCS_HTML);
    const content = generateJSON(normalized, getEditorExtensions());
    const rendered = generateHTML(content, getEditorExtensions());
    const heading = content.content?.[0];
    const paragraph = content.content?.[1];

    expect(normalized).not.toContain("docs-internal-guid-example");
    expect(heading).toMatchObject({
      type: "heading",
      attrs: {
        level: 2,
        lineHeight: 1.38,
        spaceBefore: 1,
        spaceAfter: 0.5,
        textAlign: "center",
      },
    });
    expect(heading?.content?.[0].marks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "bold" }),
        expect.objectContaining({
          type: "richTextStyle",
          attrs: {
            fontFamily: "Arial, sans-serif",
            fontSize: 18,
            color: "#1155cc",
          },
        }),
      ]),
    );
    expect(paragraph).toMatchObject({
      type: "paragraph",
      attrs: { lineHeight: 1.5, spaceBefore: 0, spaceAfter: 0.67 },
    });
    expect(paragraph?.content?.[0].marks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "italic" }),
        expect.objectContaining({ type: "underline" }),
        expect.objectContaining({
          type: "highlight",
          attrs: { color: "#fff2cc" },
        }),
        expect.objectContaining({
          type: "richTextStyle",
          attrs: {
            fontFamily: "Georgia",
            fontSize: 11,
            color: "#222222",
          },
        }),
      ]),
    );
    expect(paragraph?.content?.at(-1)?.marks).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "superscript" })]),
    );
    expect(content.content?.[2]).toMatchObject({
      type: "bulletList",
      attrs: { bulletStyle: "square" },
    });
    expect(content.content?.[3]?.type).toBe("table");
    expect(rendered).toContain("background-color: #fff2cc");
    expect(rendered).toContain("font-family: Georgia");
    expect(rendered).toContain("<table");
  });

  it("leaves ordinary clipboard HTML unchanged", () => {
    const html = '<p><span style="color: red">Ordinary paste</span></p>';
    expect(normalizeGoogleDocsPastedHtml(html)).toBe(html);
  });
});
