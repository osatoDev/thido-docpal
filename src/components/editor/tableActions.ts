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
