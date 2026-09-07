import type { Editor } from "@tiptap/react";

export type TableAction =
  | "addRowBefore"
  | "addRowAfter"
  | "deleteRow"
  | "addColumnBefore"
  | "addColumnAfter"
  | "deleteColumn"
  | "toggleHeaderRow"
  | "deleteTable";

export type TableActionItem = {
  action: TableAction;
  label: string;
  destructive?: boolean;
};

export const TABLE_ACTION_GROUPS: readonly (readonly TableActionItem[])[] = [
  [
    { action: "addRowBefore", label: "Add row above" },
    { action: "addRowAfter", label: "Add row below" },
    { action: "deleteRow", label: "Delete row", destructive: true },
  ],
  [
    { action: "addColumnBefore", label: "Add column left" },
    { action: "addColumnAfter", label: "Add column right" },
    { action: "deleteColumn", label: "Delete column", destructive: true },
  ],
  [{ action: "toggleHeaderRow", label: "Toggle header row" }],
  [{ action: "deleteTable", label: "Delete table", destructive: true }],
] as const;

export const TABLE_ACTION_ITEMS = TABLE_ACTION_GROUPS.flat();

export function runTableAction(editor: Editor, action: TableAction) {
  const chain = editor.chain().focus();

  switch (action) {
    case "addRowBefore":
      return chain.addRowBefore().run();
    case "addRowAfter":
      return chain.addRowAfter().run();
    case "deleteRow":
      return chain.deleteRow().run();
    case "addColumnBefore":
      return chain.addColumnBefore().run();
    case "addColumnAfter":
      return chain.addColumnAfter().run();
    case "deleteColumn":
      return chain.deleteColumn().run();
    case "toggleHeaderRow":
      return chain.toggleHeaderRow().run();
    case "deleteTable":
      return chain.deleteTable().run();
  }
}

/**
 * `addRowBefore`/`addRowAfter` are single-row ProseMirror commands, so
 * inserting N rows means running the command N times. Each insertion is
 * committed as its own transaction (rather than chaining N calls into one)
 * so the next iteration re-resolves the selection against the
 * already-updated table. Chaining them instead turned out to insert later
 * columns on the wrong side of the anchor for `addColumns` below (verified
 * in tableActions.test.ts), so both use the same, more robust approach
 * rather than two different strategies for the same kind of operation.
 */
export function addRows(
  editor: Editor,
  direction: "before" | "after",
  count: number,
) {
  let result = true;
  for (let index = 0; index < count; index += 1) {
    result =
      (direction === "before"
        ? editor.chain().focus().addRowBefore()
        : editor.chain().focus().addRowAfter()
      ).run() && result;
  }
  return result;
}

/** Column equivalent of `addRows`; see its comment for why each insertion is its own transaction. */
export function addColumns(
  editor: Editor,
  direction: "before" | "after",
  count: number,
) {
  let result = true;
  for (let index = 0; index < count; index += 1) {
    result =
      (direction === "before"
        ? editor.chain().focus().addColumnBefore()
        : editor.chain().focus().addColumnAfter()
      ).run() && result;
  }
  return result;
}

export function canRunTableAction(editor: Editor, action: TableAction) {
  const chain = editor.can().chain().focus();

  switch (action) {
    case "addRowBefore":
      return chain.addRowBefore().run();
    case "addRowAfter":
      return chain.addRowAfter().run();
    case "deleteRow":
      return chain.deleteRow().run();
    case "addColumnBefore":
      return chain.addColumnBefore().run();
    case "addColumnAfter":
      return chain.addColumnAfter().run();
    case "deleteColumn":
      return chain.deleteColumn().run();
    case "toggleHeaderRow":
      return chain.toggleHeaderRow().run();
    case "deleteTable":
      return chain.deleteTable().run();
  }
}
