// @vitest-environment happy-dom

import { Editor, type Content } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { afterEach, describe, expect, it } from "vitest";

import { readDocumentBookmarks } from "@/components/editor/extensions/Bookmarks";
import {
  canMoveTaskItem,
  moveTaskItem,
} from "@/components/editor/extensions/StyledTaskList";
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
  it("shows accessible arrows and reorders complete checkbox items", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First" }],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second" }],
                },
                {
                  type: "taskList",
                  content: [
                    {
                      type: "taskItem",
                      attrs: { checked: false },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Nested" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Third" }],
                },
              ],
            },
          ],
        },
      ],
    });
    const topLevelList = editor.view.dom.querySelector(
      'ul[data-type="taskList"]',
    );
    const topLevelItems = Array.from(topLevelList?.children ?? []).filter(
      (element) => element.tagName === "LI",
    );
    const firstUp = topLevelItems[0].querySelector<HTMLButtonElement>(
      'button[title="Move checklist item up"]',
    );
    const secondUp = topLevelItems[1].querySelector<HTMLButtonElement>(
      'button[title="Move checklist item up"]',
    );
    const lastDown = topLevelItems[2].querySelector<HTMLButtonElement>(
      'button[title="Move checklist item down"]',
    );

    expect(topLevelItems[0].children[0].classList).toContain(
      "task-item-move-controls",
    );
    expect(topLevelItems[0].children[1].tagName).toBe("LABEL");
    expect(firstUp?.disabled).toBe(true);
    expect(secondUp?.ariaLabel).toBe("Move checklist item up: Second");
    expect(lastDown?.disabled).toBe(true);
    secondUp?.click();

    const reorderedList = editor
      .getJSON()
      .content?.find((node) => node.type === "taskList");
    expect(reorderedList).toMatchObject({
      type: "taskList",
      content: [
        {
          attrs: { checked: true },
          content: [
            { content: [{ text: "Second" }] },
            {
              type: "taskList",
              content: [{ type: "taskItem" }],
            },
          ],
        },
        { content: [{ content: [{ text: "First" }] }] },
        { content: [{ content: [{ text: "Third" }] }] },
      ],
    });

    const reorderedItems = Array.from(topLevelList?.children ?? []).filter(
      (element) => element.tagName === "LI",
    );
    const firstDown = reorderedItems[0].querySelector<HTMLButtonElement>(
      'button[title="Move checklist item down"]',
    );
    expect(
      reorderedItems[0].querySelector<HTMLButtonElement>(
        'button[title="Move checklist item up"]',
      )?.disabled,
    ).toBe(true);
    firstDown?.click();
    const restoredList = editor
      .getJSON()
      .content?.find((node) => node.type === "taskList");
    expect(restoredList).toMatchObject({
      type: "taskList",
      content: [
        { content: [{ content: [{ text: "First" }] }] },
        {
          content: [
            { content: [{ text: "Second" }] },
            {
              type: "taskList",
              content: [{ type: "taskItem" }],
            },
          ],
        },
        { content: [{ content: [{ text: "Third" }] }] },
      ],
    });
  });

  it("rejects checkbox moves outside the current list boundaries", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Only" }],
                },
              ],
            },
          ],
        },
      ],
    });
    let itemPosition = -1;
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === "taskItem" && itemPosition === -1) {
        itemPosition = position;
      }
    });

    const beforeMove = editor.getJSON();
    expect(canMoveTaskItem(editor.state, itemPosition, "up")).toBe(false);
    expect(canMoveTaskItem(editor.state, itemPosition, "down")).toBe(false);
    expect(
      moveTaskItem(editor.state, editor.view.dispatch, itemPosition, "up"),
    ).toBe(false);
    expect(editor.getJSON()).toEqual(beforeMove);
  });

  it("indents empty checkbox items with Tab and outdents with Shift-Tab", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Parent" }],
                },
              ],
            },
            {
              type: "taskItem",
              content: [{ type: "paragraph" }],
            },
          ],
        },
      ],
    });
    let emptyTaskPosition: number | null = null;
    editor.state.doc.descendants((node, position) => {
      if (
        node.type.name === "paragraph" &&
        node.content.size === 0 &&
        emptyTaskPosition === null
      ) {
        emptyTaskPosition = position;
      }
    });
    expect(emptyTaskPosition).not.toBeNull();
    editor.commands.setTextSelection((emptyTaskPosition ?? 0) + 1);

    expect(editor.commands.keyboardShortcut("Tab")).toBe(true);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "taskList",
      content: [
        {
          type: "taskItem",
          content: [
            { type: "paragraph" },
            {
              type: "taskList",
              content: [
                {
                  type: "taskItem",
                  content: [{ type: "paragraph" }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(editor.commands.keyboardShortcut("Shift-Tab")).toBe(true);
    expect(editor.getJSON().content?.[0]?.content).toHaveLength(2);

    editor.commands.insertContent("Typed task");
    expect(editor.commands.keyboardShortcut("Tab")).toBe(true);
    expect(editor.getText()).toContain("Typed task\t");
    expect(editor.getJSON().content?.[0]?.content).toHaveLength(2);

    const paragraphEditor = makeEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Ordinary text" }],
        },
      ],
    });
    paragraphEditor.commands.setTextSelection(2);
    const paragraphBeforeTab = paragraphEditor.getJSON();
    paragraphEditor.commands.keyboardShortcut("Tab");
    expect(paragraphEditor.getJSON()).toEqual(paragraphBeforeTab);
  });

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

  it("removes and restores a heading in the document outline", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Optional section" }],
        },
      ],
    });

    editor.commands.setTextSelection(2);
    expect(editor.commands.setCurrentHeadingInOutline(false)).toBe(true);
    expect(editor.getAttributes("heading").outlineHidden).toBe(true);
    expect(editor.commands.setCurrentHeadingInOutline(true)).toBe(true);
    expect(editor.getAttributes("heading").outlineHidden).toBe(false);
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
      "one\u2014two",
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
