import { describe, expect, it } from "vitest";
import { generateHTML, generateJSON } from "@tiptap/html/server";

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
