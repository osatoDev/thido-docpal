// @vitest-environment happy-dom

import { Editor, type Content } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { afterEach, describe, expect, it } from "vitest";

import { getEditorExtensions } from "@/lib/editorExtensions";
import { addColumns, addRows } from "./tableActions";

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

const twoRowTable: Content = {
  type: "doc",
  content: [
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: "H1" }] }],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "paragraph", content: [{ type: "text", text: "R1" }] }],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "paragraph", content: [{ type: "text", text: "R2" }] }],
            },
          ],
        },
      ],
    },
  ],
};

const twoColumnTable: Content = {
  type: "doc",
  content: [
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: "C1" }] }],
            },
            {
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: "C2" }] }],
            },
          ],
        },
      ],
    },
  ],
};

/** The single row's cells, left to right, so column order is directly visible. */
function cellLabels(editor: Editor): string[] {
  const labels: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "tableRow") {
      node.forEach((cell) => labels.push(cell.textContent));
      return false;
    }
  });
  return labels;
}

function rowLabels(editor: Editor): string[] {
  const labels: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "tableRow") {
      labels.push(node.textContent);
    }
  });
  return labels;
}

/** Places the selection inside whichever node contains the text `label`. */
function selectText(editor: Editor, label: string) {
  let target: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text === label) target = pos;
  });
  if (target === null) throw new Error(`Text "${label}" not found`);
  const selection = TextSelection.near(editor.state.doc.resolve(target));
  editor.view.dispatch(editor.state.tr.setSelection(selection));
}

describe("addRows", () => {
  it("inserts the requested number of rows after the current row, in order", () => {
    const editor = makeEditor(twoRowTable);
    selectText(editor, "R1");

    addRows(editor, "after", 3);

    expect(rowLabels(editor)).toEqual(["H1", "R1", "", "", "", "R2"]);
  });

  it("inserts the requested number of rows before the current row, in order", () => {
    const editor = makeEditor(twoRowTable);
    selectText(editor, "R2");

    addRows(editor, "before", 3);

    expect(rowLabels(editor)).toEqual(["H1", "R1", "", "", "", "R2"]);
  });

  it("matches the existing single-row behavior when count is 1", () => {
    const editor = makeEditor(twoRowTable);
    selectText(editor, "R1");

    addRows(editor, "after", 1);

    expect(rowLabels(editor)).toEqual(["H1", "R1", "", "R2"]);
  });
});

describe("addColumns", () => {
  it("inserts the requested number of columns after the current column, in order", () => {
    const editor = makeEditor(twoColumnTable);
    selectText(editor, "C1");

    addColumns(editor, "after", 3);

    expect(cellLabels(editor)).toEqual(["C1", "", "", "", "C2"]);
  });

  it("inserts the requested number of columns before the current column, in order", () => {
    const editor = makeEditor(twoColumnTable);
    selectText(editor, "C2");

    addColumns(editor, "before", 3);

    expect(cellLabels(editor)).toEqual(["C1", "", "", "", "C2"]);
  });

  it("matches the existing single-column behavior when count is 1", () => {
    const editor = makeEditor(twoColumnTable);
    selectText(editor, "C1");

    addColumns(editor, "after", 1);

    expect(cellLabels(editor)).toEqual(["C1", "", "C2"]);
  });
});
