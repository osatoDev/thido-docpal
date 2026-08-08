import { describe, expect, it } from "vitest";
import { generateHTML, generateJSON } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/core";

import { getEditorExtensions } from "@/lib/editorExtensions";

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
      content: [{ type: "taskItem", attrs: { checked: true } }],
    });
    expect(content.content?.[1].type).toBe("table");
    expect(html).toContain('data-type="taskList"');
    expect(html).toContain("<th");
    expect(html).toContain("<td");
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
});
