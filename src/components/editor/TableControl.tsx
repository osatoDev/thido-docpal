"use client";

import { useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { TableSizeDialog } from "./TableSizeDialog";
import {
  runTableAction,
  TABLE_ACTION_ITEMS,
  type TableAction,
} from "./tableActions";

export function TableControl({ editor }: { editor: Editor }) {
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false);
  const inTable = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor.isActive("table"),
  });

  if (!inTable) {
    return (
      <>
        <button
          type="button"
          aria-label="Insert a table"
          title="Insert table"
          onClick={() => setSizeDialogOpen(true)}
          className="rounded-sm px-2 py-1 text-sm font-medium hover:bg-[var(--surface-subtle)]"
        >
          Table
        </button>
        {sizeDialogOpen ? (
          <TableSizeDialog
            onSubmit={(rows, cols) =>
              editor
                .chain()
                .focus()
                .insertTable({ rows, cols, withHeaderRow: true })
                .run()
            }
            onClose={() => setSizeDialogOpen(false)}
          />
        ) : null}
      </>
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
