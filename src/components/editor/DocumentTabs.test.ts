// @vitest-environment happy-dom

import { Editor, type Content } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { readActiveTabPosition } from "@/components/editor/DocumentTabs";
import { readHeadings } from "@/components/editor/DocumentOutline";
import { getEditorExtensions } from "@/lib/editorExtensions";

const editors: Editor[] = [];

function makeEditor(content: Content) {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: getEditorExtensions(),
    content,
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

function heading(level: number, text: string) {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}

function paragraph(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

describe("document tabs (top-level heading navigator)", () => {
  it("only surfaces level-1 headings as tabs", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        heading(1, "Overview"),
        heading(2, "Background"),
        heading(1, "Details"),
      ],
    });
    const tabs = readHeadings(editor).filter((h) => h.level === 1);
    expect(tabs.map((tab) => tab.text)).toEqual(["Overview", "Details"]);
  });

  it("has no tabs when the document has no level-1 headings", () => {
    const editor = makeEditor({
      type: "doc",
      content: [heading(2, "Just a subsection"), paragraph("Body")],
    });
    const tabs = readHeadings(editor).filter((h) => h.level === 1);
    expect(tabs).toHaveLength(0);
    expect(readActiveTabPosition(editor, tabs)).toBeNull();
  });

  it("identifies the enclosing top-level section for the current cursor position", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        heading(1, "Overview"),
        paragraph("Intro text"),
        heading(1, "Details"),
        heading(2, "Sub-detail"),
        paragraph("More text"),
      ],
    });
    const tabs = readHeadings(editor).filter((h) => h.level === 1);
    expect(tabs).toHaveLength(2);

    // Cursor inside the "Overview" section's paragraph.
    editor.commands.setTextSelection(1);
    expect(readActiveTabPosition(editor, tabs)).toBe(tabs[0].position);

    // Cursor inside the nested "Sub-detail" heading, still within "Details".
    let subDetailPosition = -1;
    editor.state.doc.descendants((node, position) => {
      if (
        subDetailPosition === -1 &&
        node.type.name === "heading" &&
        node.textContent === "Sub-detail"
      ) {
        subDetailPosition = position;
      }
    });
    expect(subDetailPosition).toBeGreaterThan(-1);
    editor.commands.setTextSelection(subDetailPosition + 1);
    expect(readActiveTabPosition(editor, tabs)).toBe(tabs[1].position);
  });
});
