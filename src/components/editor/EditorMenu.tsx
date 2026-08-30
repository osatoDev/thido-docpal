"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Tooltip } from "@/components/Tooltip";
import {
  calculateSideMenuPosition,
  type SideMenuPosition,
} from "@/lib/menuPosition";

export type MenuItem = {
  label: string;
  onSelect?: () => void;
  shortcut?: string;
  disabled?: boolean;
  children?: readonly MenuItem[];
};

export function EditorMenuItem({
  item,
  closeMenu,
  expandedSubmenus,
  menuTreeId,
  onSubmenuToggle,
  depth = 0,
}: {
  item: MenuItem;
  closeMenu: () => void;
  expandedSubmenus: Readonly<Record<number, string>>;
  menuTreeId: string;
  onSubmenuToggle: (
    depth: number,
    submenuId: string,
    expanded: boolean,
  ) => void;
  depth?: number;
}) {
  const [submenuPosition, setSubmenuPosition] =
    useState<SideMenuPosition | null>(null);
  const submenuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const hasChildren = Boolean(item.children?.length);
  const expanded = expandedSubmenus[depth] === submenuId;

  function openSubmenu() {
    onSubmenuToggle(depth, submenuId, true);
    window.requestAnimationFrame(() => {
      document
        .getElementById(submenuId)
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus();
    });
  }

  useLayoutEffect(() => {
    if (!expanded || !buttonRef.current || !submenuRef.current) return;

    function positionSubmenu() {
      const button = buttonRef.current;
      const submenu = submenuRef.current;
      if (!button || !submenu) return;
      const anchor = button.getBoundingClientRect();
      setSubmenuPosition(
        calculateSideMenuPosition({
          anchor,
          menuHeight: submenu.scrollHeight,
          menuWidth: submenu.offsetWidth,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        }),
      );
    }

    positionSubmenu();
    window.addEventListener("resize", positionSubmenu);
    window.addEventListener("scroll", positionSubmenu, true);
    return () => {
      window.removeEventListener("resize", positionSubmenu);
      window.removeEventListener("scroll", positionSubmenu, true);
    };
  }, [expanded]);

  function handleSubmenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      onSubmenuToggle(depth, submenuId, false);
      buttonRef.current?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    const items = Array.from(
      submenuRef.current?.querySelectorAll<HTMLButtonElement>(
        ':scope > [role="menuitem"]:not(:disabled)',
      ) ?? [],
    );
    if (items.length === 0) return;

    event.preventDefault();
    event.stopPropagation();
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
      <button
        ref={buttonRef}
        type="button"
        role="menuitem"
        disabled={item.disabled}
        aria-haspopup={hasChildren ? "menu" : undefined}
        aria-expanded={hasChildren ? expanded : undefined}
        aria-controls={hasChildren ? submenuId : undefined}
        onClick={() => {
          if (hasChildren) {
            if (expanded) {
              onSubmenuToggle(depth, submenuId, false);
            } else {
              openSubmenu();
            }
            return;
          }
          closeMenu();
          item.onSelect?.();
        }}
        onKeyDown={(event) => {
          if (!hasChildren || event.key !== "ArrowRight") return;
          event.preventDefault();
          event.stopPropagation();
          openSubmenu();
        }}
        className="flex w-full items-center justify-between gap-4 rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-45"
        style={depth > 0 ? { paddingInlineStart: `${0.75 + depth * 0.75}rem` } : undefined}
      >
        <span>{item.label}</span>
        {hasChildren ? (
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="size-3.5 shrink-0 fill-none stroke-current"
            strokeWidth="1.8"
          >
            <path d="m6 3 5 5-5 5" />
          </svg>
        ) : item.shortcut ? (
          <kbd className="shrink-0 font-sans text-xs font-normal text-[var(--muted)]">
            {item.shortcut}
          </kbd>
        ) : null}
      </button>
      {hasChildren && expanded && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={submenuRef}
              id={submenuId}
              role="menu"
              aria-label={item.label}
              data-editor-menu-tree={menuTreeId}
              data-side={submenuPosition?.side ?? "right"}
              className="app-panel fixed z-50 w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-md p-1.5 text-sm shadow-lg"
              style={{
                left: submenuPosition?.left ?? 0,
                maxHeight: submenuPosition?.maxHeight,
                top: submenuPosition?.top ?? 0,
                visibility: submenuPosition ? "visible" : "hidden",
              }}
              onKeyDown={handleSubmenuKeyDown}
            >
              {item.children?.map((child) => (
                <EditorMenuItem
                  key={child.label}
                  item={child}
                  closeMenu={closeMenu}
                  expandedSubmenus={expandedSubmenus}
                  menuTreeId={menuTreeId}
                  onSubmenuToggle={onSubmenuToggle}
                  depth={depth + 1}
                />
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function EditorMenu({
  label,
  groups,
  tooltip,
}: {
  label: string;
  groups: readonly (readonly MenuItem[])[];
  tooltip?: string;
}) {
  const [open, setOpen] = useState(false);
  const [expandedSubmenus, setExpandedSubmenus] = useState<
    Record<number, string>
  >({});
  const [menuOffset, setMenuOffset] = useState(0);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeEditorMenu = useCallback(() => {
    setOpen(false);
    setExpandedSubmenus({});
  }, []);

  const updateExpandedSubmenu = useCallback(
    (depth: number, submenuId: string, expanded: boolean) => {
      setExpandedSubmenus((current) => {
        const next: Record<number, string> = {};
        for (const [level, openSubmenuId] of Object.entries(current)) {
          if (Number(level) < depth) next[Number(level)] = openSubmenuId;
        }
        if (expanded) next[depth] = submenuId;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!open) return;

    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();

    function closeOnOutsidePointer(event: PointerEvent) {
      const menuTree =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-editor-menu-tree]")
          : null;
      if (menuTree?.dataset.editorMenuTree !== menuId) closeEditorMenu();
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closeEditorMenu();
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeEditorMenu, menuId, open]);

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;

    function keepMenuInViewport() {
      const bounds = menuRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const viewportGutter = 8;
      const naturalLeft = bounds.left - menuOffset;
      const naturalRight = bounds.right - menuOffset;
      let nextOffset = 0;
      if (naturalRight > window.innerWidth - viewportGutter) {
        nextOffset = window.innerWidth - viewportGutter - naturalRight;
      }
      if (naturalLeft + nextOffset < viewportGutter) {
        nextOffset += viewportGutter - (naturalLeft + nextOffset);
      }
      setMenuOffset(nextOffset);
    }

    keepMenuInViewport();
    window.addEventListener("resize", keepMenuInViewport);
    return () => window.removeEventListener("resize", keepMenuInViewport);
  }, [menuOffset, open]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
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

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      onClick={() => {
        if (open) {
          closeEditorMenu();
        } else {
          setOpen(true);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setOpen(true);
        }
      }}
      className="rounded-sm px-2 py-1 text-sm hover:bg-[var(--surface-subtle)]"
    >
      {label}
    </button>
  );

  return (
    <div className="relative" data-editor-menu-tree={menuId}>
      {tooltip ? (
        <Tooltip label={tooltip} placement="bottom">
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className="app-panel absolute top-full left-0 z-40 mt-1 max-h-[min(70vh,32rem)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-md p-1.5 text-sm shadow-lg"
          style={{ transform: `translateX(${menuOffset}px)` }}
        >
          {groups.map((group, groupIndex) => (
            <div key={`${label}-${groupIndex}`}>
              {groupIndex > 0 ? (
                <div
                  role="separator"
                  className="my-1 border-t border-[var(--border)]"
                />
              ) : null}
              {group.map((item) => (
                <EditorMenuItem
                  key={item.label}
                  item={item}
                  closeMenu={closeEditorMenu}
                  expandedSubmenus={expandedSubmenus}
                  menuTreeId={menuId}
                  onSubmenuToggle={updateExpandedSubmenu}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
