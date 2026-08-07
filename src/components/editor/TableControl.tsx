"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  runTableAction,
  TABLE_ACTION_ITEMS,
  type TableAction,
} from "./tableActions";

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
        runTableAction(editor, action);
      }}
      className="app-input rounded-sm px-2 py-1 text-sm outline-none"
    >
      <option value="">Table actions</option>
      {TABLE_ACTION_ITEMS.map((item) => (
        <option key={item.action} value={item.action}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
