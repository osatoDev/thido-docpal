// @vitest-environment happy-dom

import { Editor, type Content } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { readDocumentBookmarks } from "@/components/editor/extensions/Bookmarks";
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

function topLevelText(editor: Editor) {
  return editor.state.doc.content.content.map((node) => node.textContent);
}

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe("block productivity commands", () => {
  it("duplicates and reorders the current top-level block", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "One" }] },
        { type: "paragraph", content: [{ type: "text", text: "Two" }] },
      ],
    });

    editor.commands.setTextSelection(6);
    expect(editor.commands.duplicateCurrentBlock()).toBe(true);
    expect(topLevelText(editor)).toEqual(["One", "Two", "Two"]);
    expect(editor.commands.moveCurrentBlockUp()).toBe(true);
    expect(topLevelText(editor)).toEqual(["One", "Two", "Two"]);
    editor.commands.insertContent(" copy");
    expect(topLevelText(editor)).toEqual(["One", " copyTwo", "Two"]);
    expect(editor.commands.moveCurrentBlockDown()).toBe(true);
    expect(topLevelText(editor)).toEqual(["One", "Two", " copyTwo"]);
  });

  it("inserts editable paragraphs above and below the active block", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Middle" }] },
      ],
    });

    expect(editor.commands.insertParagraphAbove()).toBe(true);
    editor.commands.insertContent("Above");
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    expect(editor.commands.insertParagraphBelow()).toBe(true);
    editor.commands.insertContent("Below");
    expect(topLevelText(editor)).toEqual(["Above", "Middle", "Below"]);
  });
});

describe("document navigation and bookmarks", () => {
  it("moves to adjacent headings", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "First" }],
        },
        { type: "paragraph", content: [{ type: "text", text: "Body" }] },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Second" }],
        },
      ],
    });

    editor.commands.setTextSelection(1);
    expect(editor.commands.goToNextHeading()).toBe(true);
    expect(editor.state.selection.from).toBeGreaterThan(1);
    expect(editor.commands.goToPreviousHeading()).toBe(true);
    expect(editor.state.selection.from).toBe(1);
  });

  it("inserts, renames, and deletes a named bookmark", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Decision" }] },
      ],
    });

    editor.commands.setTextSelection(5);
    expect(editor.commands.insertBookmark("Key decision")).toBe(true);
    const [bookmark] = readDocumentBookmarks(editor.state.doc);
    expect(bookmark).toMatchObject({ label: "Key decision" });
    expect(editor.commands.renameBookmark(bookmark.bookmarkId, "Approved decision")).toBe(
      true,
    );
    expect(readDocumentBookmarks(editor.state.doc)[0]?.label).toBe(
      "Approved decision",
    );
    expect(editor.commands.deleteBookmark(bookmark.bookmarkId)).toBe(true);
    expect(readDocumentBookmarks(editor.state.doc)).toEqual([]);
  });
});
