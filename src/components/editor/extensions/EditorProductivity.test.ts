// @vitest-environment happy-dom

import { Editor, type Content } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { afterEach, describe, expect, it } from "vitest";

import { readDocumentBookmarks } from "@/components/editor/extensions/Bookmarks";
import { transformCleanupText } from "@/components/editor/extensions/TextCleanup";
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

  it("selects, merges, and deletes top-level text blocks", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "One" }] },
        { type: "paragraph", content: [{ type: "text", text: "Two" }] },
        { type: "paragraph", content: [{ type: "text", text: "Three" }] },
      ],
    });

    editor.commands.setTextSelection(6);
    expect(editor.commands.selectCurrentBlock()).toBe(true);
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    expect(editor.commands.mergeCurrentBlockWithPrevious()).toBe(true);
    expect(topLevelText(editor)).toEqual(["OneTwo", "Three"]);
    editor.commands.setTextSelection(2);
    expect(editor.commands.mergeCurrentBlockWithNext()).toBe(true);
    expect(topLevelText(editor)).toEqual(["OneTwoThree"]);
    expect(editor.commands.deleteCurrentBlock()).toBe(true);
    expect(topLevelText(editor)).toEqual([""]);
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

  it("navigates document edges, paragraphs, and tables", () => {
    const table = (label: string) => ({
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: label }],
                },
              ],
            },
          ],
        },
      ],
    });
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First" }] },
        table("Table one"),
        { type: "paragraph", content: [{ type: "text", text: "Middle" }] },
        table("Table two"),
        { type: "paragraph", content: [{ type: "text", text: "Last" }] },
      ],
    });

    editor.commands.goToDocumentEnd();
    expect(editor.state.selection.from).toBeGreaterThan(1);
    expect(editor.commands.goToDocumentStart()).toBe(true);
    expect(editor.state.selection.from).toBe(1);
    expect(editor.commands.goToNextParagraph()).toBe(true);
    expect(editor.state.selection.$from.parent.textContent).toBe("Table one");
    expect(editor.commands.goToNextTable()).toBe(true);
    expect(
      Array.from({ length: editor.state.selection.$from.depth }, (_, index) =>
        editor.state.selection.$from.node(index + 1).type.name,
      ),
    ).toContain("table");
    expect(editor.commands.goToPreviousTable()).toBe(true);
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

describe("text cleanup commands", () => {
  it("supports all ten cleanup transformations", () => {
    expect(transformCleanupText("A   B", "collapseSpaces")).toBe("A B");
    expect(transformCleanupText("A\tB", "tabsToSpaces")).toBe("A  B");
    expect(transformCleanupText("A\u200BB", "removeZeroWidth")).toBe("AB");
    expect(transformCleanupText("soft\u00ADhyphen", "removeSoftHyphens")).toBe(
      "softhyphen",
    );
    expect(
      transformCleanupText("A\u00A0B", "replaceNonBreakingSpaces"),
    ).toBe("A B");
    expect(transformCleanupText("A\u2009B", "normalizeUnicodeSpaces")).toBe(
      "A B",
    );
    expect(transformCleanupText('"Hello" \'world\'', "smartQuotes")).toBe(
      "“Hello” ‘world’",
    );
    expect(transformCleanupText("“Hello” ‘world’", "straightQuotes")).toBe(
      '"Hello" \'world\'',
    );
    expect(transformCleanupText("one--two", "normalizeDashes")).toBe(
      "one—two",
    );
    expect(transformCleanupText("Wait...", "normalizeEllipses")).toBe(
      "Wait…",
    );
  });

  it("cleans the current paragraph while preserving text marks", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: "Keep  formatting",
            },
          ],
        },
      ],
    });

    editor.commands.setTextSelection(3);
    expect(editor.commands.cleanUpText("collapseSpaces")).toBe(true);
    expect(editor.state.doc.textContent).toBe("Keep formatting");
    expect(editor.state.doc.firstChild?.firstChild?.marks[0]?.type.name).toBe(
      "bold",
    );
  });
});
