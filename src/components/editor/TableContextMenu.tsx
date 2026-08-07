"use client";

import {
  useEffect,
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

export function TableContextMenu({
  editor,
  children,
}: {
  editor: Editor;
  children: ReactNode;
}) {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

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
    setPosition({
      x: event.clientX || cellBounds.left + 12,
      y: event.clientY || cellBounds.top + 12,
    });
  }

  function chooseAction(action: TableAction) {
    runTableAction(editor, action);
    setPosition(null);
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setPosition(null);
      editor.commands.focus();
      return;
    }

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
                {group.map((item, itemIndex) => (
                  <button
                    key={item.action}
                    ref={
                      groupIndex === 0 && itemIndex === 0 ? firstItemRef : null
                    }
                    type="button"
                    role="menuitem"
                    disabled={!canRunTableAction(editor, item.action)}
                    onClick={() => chooseAction(item.action)}
                    className={`block w-full rounded-sm px-2 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-45 ${
                      item.destructive
                        ? "text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
                        : "text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
