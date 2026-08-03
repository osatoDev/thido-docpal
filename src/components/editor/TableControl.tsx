"use client";

import { useEditorState, type Editor } from "@tiptap/react";

const TABLE_ACTIONS = {
  addRowBefore: (editor: Editor) => editor.chain().focus().addRowBefore().run(),
  addRowAfter: (editor: Editor) => editor.chain().focus().addRowAfter().run(),
  deleteRow: (editor: Editor) => editor.chain().focus().deleteRow().run(),
  addColumnBefore: (editor: Editor) =>
    editor.chain().focus().addColumnBefore().run(),
  addColumnAfter: (editor: Editor) =>
    editor.chain().focus().addColumnAfter().run(),
  deleteColumn: (editor: Editor) => editor.chain().focus().deleteColumn().run(),
  toggleHeaderRow: (editor: Editor) =>
    editor.chain().focus().toggleHeaderRow().run(),
  deleteTable: (editor: Editor) => editor.chain().focus().deleteTable().run(),
} as const;

type TableAction = keyof typeof TABLE_ACTIONS;

export function TableControl({ editor }: { editor: Editor }) {
  const inTable = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor.isActive("table"),
  });

  if (!inTable) {
    return (
      <button
        type="button"
        aria-label="Insert a 3 by 3 table"
        title="Insert table"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        className="rounded-sm px-2 py-1 text-sm font-medium hover:bg-[var(--surface-subtle)]"
      >
        Table
      </button>
    );
  }

  return (
    <select
      value=""
      aria-label="Table actions"
      title="Table actions"
      onChange={(event) => {
        const action = event.target.value as TableAction;
        TABLE_ACTIONS[action]?.(editor);
      }}
      className="app-input rounded-sm px-2 py-1 text-sm outline-none"
    >
      <option value="">Table actions</option>
      <option value="addRowBefore">Add row above</option>
      <option value="addRowAfter">Add row below</option>
      <option value="deleteRow">Delete row</option>
      <option value="addColumnBefore">Add column before</option>
      <option value="addColumnAfter">Add column after</option>
      <option value="deleteColumn">Delete column</option>
      <option value="toggleHeaderRow">Toggle header row</option>
      <option value="deleteTable">Delete table</option>
    </select>
  );
}
