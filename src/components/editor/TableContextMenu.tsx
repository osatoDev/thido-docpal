"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import {
  addColumns,
  addRows,
  canRunTableAction,
  runTableAction,
  TABLE_ACTION_GROUPS,
  type TableAction,
} from "./tableActions";

type MenuPosition = {
  x: number;
  y: number;
};

const VIEWPORT_GUTTER = 8;
const MIN_COUNT = 1;
const MAX_ROWS_TO_ADD = 20;
const MAX_COLS_TO_ADD = 10;
const ROW_ACTION_GROUP_INDEX = 0;
const COLUMN_ACTION_GROUP_INDEX = 1;

function clampCount(value: number, max: number): number {
  if (!Number.isFinite(value)) return MIN_COUNT;
  return Math.min(max, Math.max(MIN_COUNT, Math.round(value)));
}

export function TableContextMenu({
  editor,
  children,
}: {
  editor: Editor;
  children: ReactNode;
}) {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [rowCount, setRowCount] = useState(1);
  const [colCount, setColCount] = useState(1);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const rowCountId = useId();
  const colCountId = useId();

  useEffect(() => {
    if (!position) return;

    function closeMenu(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setPosition(null);
      }
    }

    function closeForViewportChange() {
      setPosition(null);
    }

    document.addEventListener("pointerdown", closeMenu);
    window.addEventListener("resize", closeForViewportChange);
    window.addEventListener("scroll", closeForViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("resize", closeForViewportChange);
      window.removeEventListener("scroll", closeForViewportChange, true);
    };
  }, [position]);

  useLayoutEffect(() => {
    if (!position || !menuRef.current) return;

    const bounds = menuRef.current.getBoundingClientRect();
    const x = Math.max(
      VIEWPORT_GUTTER,
      Math.min(position.x, window.innerWidth - bounds.width - VIEWPORT_GUTTER),
    );
    const y = Math.max(
      VIEWPORT_GUTTER,
      Math.min(
        position.y,
        window.innerHeight - bounds.height - VIEWPORT_GUTTER,
      ),
    );

    if (x !== position.x || y !== position.y) {
      setPosition({ x, y });
      return;
    }

    firstItemRef.current?.focus();
  }, [position]);

  function openMenu(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const cell = target.closest("td, th");
    if (!cell || !event.currentTarget.contains(cell)) return;

    event.preventDefault();

    const cellPosition = editor.view.posAtDOM(cell, 0);
    const selection = TextSelection.near(
      editor.state.doc.resolve(cellPosition + 1),
    );
    editor.view.dispatch(editor.state.tr.setSelection(selection));

    const cellBounds = cell.getBoundingClientRect();
    setRowCount(1);
    setColCount(1);
    setPosition({
      x: event.clientX || cellBounds.left + 12,
      y: event.clientY || cellBounds.top + 12,
    });
  }

  function chooseAction(action: TableAction) {
    runTableAction(editor, action);
    setPosition(null);
  }

  function chooseAddRows(direction: "before" | "after") {
    addRows(editor, direction, rowCount);
    setPosition(null);
  }

  function chooseAddColumns(direction: "before" | "after") {
    addColumns(editor, direction, colCount);
    setPosition(null);
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setPosition(null);
      editor.commands.focus();
      return;
    }

    // Let the row-count field handle its own arrow keys (cursor movement,
    // the native number spinner) and digit entry instead of the menu
    // hijacking them for roving focus between menu items.
    if (event.target instanceof HTMLInputElement) return;

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    );
    if (items.length === 0) return;

    event.preventDefault();
    const currentIndex = items.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    let nextIndex = currentIndex;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    }
    if (event.key === "ArrowUp") {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    }

    items[nextIndex]?.focus();
  }

  return (
    <>
      <div onContextMenu={openMenu}>{children}</div>
      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Table actions"
            onKeyDown={handleMenuKeyDown}
            className="print-hidden fixed z-50 w-56 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl"
            style={{ left: position.x, top: position.y }}
          >
            <p className="px-2 py-1.5 text-xs font-semibold text-[var(--muted)]">
              Table
            </p>
            {TABLE_ACTION_GROUPS.map((group, groupIndex) => (
              <div key={group[0].action}>
                {groupIndex > 0 && (
                  <div
                    role="separator"
                    className="my-1 border-t border-[var(--border)]"
                  />
                )}
                {groupIndex === ROW_ACTION_GROUP_INDEX && (
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <label
                      htmlFor={rowCountId}
                      className="text-xs text-[var(--muted)]"
                    >
                      Rows to add
                    </label>
                    <input
                      id={rowCountId}
                      type="number"
                      inputMode="numeric"
                      min={MIN_COUNT}
                      max={MAX_ROWS_TO_ADD}
                      step={1}
                      value={rowCount}
                      onChange={(event) =>
                        setRowCount(
                          clampCount(Number(event.target.value), MAX_ROWS_TO_ADD),
                        )
                      }
                      className="app-input w-14 rounded-sm px-1.5 py-0.5 text-sm outline-none"
                    />
                  </div>
                )}
                {groupIndex === COLUMN_ACTION_GROUP_INDEX && (
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <label
                      htmlFor={colCountId}
                      className="text-xs text-[var(--muted)]"
                    >
                      Columns to add
                    </label>
                    <input
                      id={colCountId}
                      type="number"
                      inputMode="numeric"
                      min={MIN_COUNT}
                      max={MAX_COLS_TO_ADD}
                      step={1}
                      value={colCount}
                      onChange={(event) =>
                        setColCount(
                          clampCount(Number(event.target.value), MAX_COLS_TO_ADD),
                        )
                      }
                      className="app-input w-14 rounded-sm px-1.5 py-0.5 text-sm outline-none"
                    />
                  </div>
                )}
                {group.map((item, itemIndex) => {
                  const isAddRow =
                    item.action === "addRowBefore" ||
                    item.action === "addRowAfter";
                  const isAddColumn =
                    item.action === "addColumnBefore" ||
                    item.action === "addColumnAfter";
                  const label = isAddRow
                    ? rowCount === 1
                      ? item.label
                      : item.label.replace("row", `${rowCount} rows`)
                    : isAddColumn
                      ? colCount === 1
                        ? item.label
                        : item.label.replace("column", `${colCount} columns`)
                      : item.label;
                  return (
                    <button
                      key={item.action}
                      ref={
                        groupIndex === 0 && itemIndex === 0
                          ? firstItemRef
                          : null
                      }
                      type="button"
                      role="menuitem"
                      disabled={!canRunTableAction(editor, item.action)}
                      onClick={() =>
                        isAddRow
                          ? chooseAddRows(
                              item.action === "addRowBefore"
                                ? "before"
                                : "after",
                            )
                          : isAddColumn
                            ? chooseAddColumns(
                                item.action === "addColumnBefore"
                                  ? "before"
                                  : "after",
                              )
                            : chooseAction(item.action)
                      }
                      className={`block w-full rounded-sm px-2 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-45 ${
                        item.destructive
                          ? "text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
                          : "text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
