"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

import { DocumentFileMenu } from "@/components/documents/DocumentMoreActions";
import type { RestoredDocument } from "@/components/documents/VersionHistoryControl";
import { BookmarkDialog } from "./BookmarkDialog";
import { FindReplaceDialog } from "./FindReplaceDialog";
import { FootnoteDialog } from "./FootnoteDialog";
import { LinkControl } from "./LinkControl";
import { WordCountDialog } from "./WordCountDialog";
import {
  DOCUMENT_LANGUAGE_OPTIONS,
  getDocumentPreferences,
} from "./extensions/DocumentPreferences";
import { LINE_HEIGHT_OPTIONS } from "./extensions/ParagraphFormatting";
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
} from "./extensions/RichTextStyle";
import type { TextCaseMode } from "./extensions/TextCase";
import {
  BULLET_STYLES,
  isBulletStyle,
  type BulletStyle,
} from "./extensions/StyledBulletList";

const bulletStyleLabels: Record<BulletStyle, string> = {
  disc: "● Disc",
  circle: "○ Circle",
  square: "■ Square",
};
const DOCUMENT_ZOOM_OPTIONS = [75, 100, 125, 150] as const;
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;
const TEXT_COLOR_OPTIONS = [
  { label: "Default color", value: "" },
  { label: "Black", value: "#161916" },
  { label: "Red", value: "#b42318" },
  { label: "Blue", value: "#175cd3" },
  { label: "Green", value: "#067647" },
  { label: "Purple", value: "#6941c6" },
] as const;
const HIGHLIGHT_COLOR_OPTIONS = [
  { label: "No highlight", value: "" },
  { label: "Yellow highlight", value: "#fde68a" },
  { label: "Green highlight", value: "#bbf7d0" },
  { label: "Blue highlight", value: "#bfdbfe" },
  { label: "Pink highlight", value: "#fbcfe8" },
] as const;

type MenuItem = {
  label: string;
  onSelect?: () => void;
  shortcut?: string;
  disabled?: boolean;
  children?: readonly MenuItem[];
};

function EditorMenuItem({
  item,
  closeMenu,
  depth = 0,
}: {
  item: MenuItem;
  closeMenu: () => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const submenuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasChildren = Boolean(item.children?.length);

  function openSubmenu() {
    setExpanded(true);
    window.requestAnimationFrame(() => {
      document
        .getElementById(submenuId)
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus();
    });
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
            setExpanded((current) => !current);
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
            className={`size-3.5 shrink-0 fill-none stroke-current transition-transform ${expanded ? "rotate-90" : ""}`}
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
      {hasChildren && expanded ? (
        <div
          id={submenuId}
          role="menu"
          aria-label={item.label}
          className="mx-1 mb-1 border-s border-[var(--border)] ps-1"
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft") return;
            event.preventDefault();
            event.stopPropagation();
            setExpanded(false);
            buttonRef.current?.focus();
          }}
        >
          {item.children?.map((child) => (
            <EditorMenuItem
              key={child.label}
              item={child}
              closeMenu={closeMenu}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

function EditorMenu({
  label,
  groups,
}: {
  label: string;
  groups: readonly (readonly MenuItem[])[];
}) {
  const [open, setOpen] = useState(false);
  const [menuOffset, setMenuOffset] = useState(0);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

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

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
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
                  closeMenu={() => setOpen(false)}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  onClick,
  isActive,
  label,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-sm hover:bg-[var(--surface-subtle)] ${
        isActive ? "bg-[var(--foreground)] text-[var(--surface)]" : ""
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-[var(--border)]" />;
}

export function Toolbar({
  editor,
  documentId,
  currentRevision,
  canEdit,
  canViewHistory,
  commentsOpen,
  outlineOpen,
  zoom,
  onToggleComments,
  onToggleOutline,
  onEditWithAi,
  onZoomChange,
  onImport,
  onConflict,
}: {
  editor: Editor | null;
  documentId: string;
  currentRevision: number;
  canEdit: boolean;
  canViewHistory: boolean;
  commentsOpen: boolean;
  outlineOpen: boolean;
  zoom: number;
  onToggleComments: () => void;
  onToggleOutline: () => void;
  onEditWithAi: () => void;
  onZoomChange: (zoom: number) => void;
  onImport: (document: RestoredDocument) => void;
  onConflict: (message: string) => void;
}) {
  const imageInputId = useId();
  const linkControlId = useId();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [footnoteOpen, setFootnoteOpen] = useState(false);
  const [wordCountOpen, setWordCountOpen] = useState(false);
  const [, setEditorVersion] = useState(0);
  const activeBulletStyle =
    editor && isBulletStyle(editor.getAttributes("bulletList").bulletStyle)
      ? (editor.getAttributes("bulletList").bulletStyle as BulletStyle)
      : "disc";
  const activeHeadingLevel = HEADING_LEVELS.find((level) =>
    editor?.isActive("heading", { level }),
  );
  const activeBlockStyle = activeHeadingLevel
    ? `heading-${activeHeadingLevel}`
    : "paragraph";
  const activeBlockAttributes = editor?.getAttributes(
    activeHeadingLevel ? "heading" : "paragraph",
  );
  const activeTextStyle = editor?.getAttributes("richTextStyle") ?? {};
  const activeHighlight = editor?.getAttributes("highlight") ?? {};
  const documentPreferences = editor
    ? getDocumentPreferences(editor.state.doc)
    : null;

  useEffect(() => {
    if (!editor) return;
    const currentEditor = editor;

    function handleDocumentShortcut(event: KeyboardEvent) {
      if ((event.target as Element | null)?.closest('[role="dialog"]')) return;
      const key = event.key.toLowerCase();
      const findAndReplace =
        (event.ctrlKey && !event.metaKey && !event.shiftKey && key === "h") ||
        (event.metaKey && event.shiftKey && key === "h");
      const wordCount =
        (event.ctrlKey || event.metaKey) && event.shiftKey && key === "c";
      const insertLink =
        canEdit &&
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        key === "k";
      const clearFormatting =
        canEdit &&
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        key === "\\";

      if (findAndReplace && canEdit) {
        event.preventDefault();
        setFindReplaceOpen(true);
      } else if (wordCount) {
        event.preventDefault();
        setWordCountOpen(true);
      } else if (insertLink) {
        event.preventDefault();
        document.getElementById(linkControlId)?.click();
      } else if (clearFormatting) {
        event.preventDefault();
        currentEditor.chain().focus().unsetAllMarks().clearNodes().run();
      }
    }

    document.addEventListener("keydown", handleDocumentShortcut);
    return () => document.removeEventListener("keydown", handleDocumentShortcut);
  }, [canEdit, editor, linkControlId]);

  useEffect(() => {
    if (!editor) return;
    const refreshToolbar = () =>
      setEditorVersion((version) => version + 1);
    editor.on("transaction", refreshToolbar);
    return () => {
      editor.off("transaction", refreshToolbar);
    };
  }, [editor]);

  function handleMenuBarKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) ||
      (event.target as Element).closest('[role="menu"]')
    ) {
      return;
    }

    const triggers = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"][aria-haspopup="menu"]',
      ),
    );
    if (triggers.length === 0) return;

    event.preventDefault();
    const currentIndex = triggers.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    let nextIndex = currentIndex;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = triggers.length - 1;
    if (event.key === "ArrowRight") {
      nextIndex = currentIndex < triggers.length - 1 ? currentIndex + 1 : 0;
    }
    if (event.key === "ArrowLeft") {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : triggers.length - 1;
    }
    triggers[nextIndex]?.focus();
  }

  function setBulletStyle(bulletStyle: BulletStyle) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (!editor.isActive("bulletList")) chain.toggleBulletList();
    chain.updateAttributes("bulletList", { bulletStyle }).run();
  }

  function setBlockStyle(value: string) {
    if (!editor) return;
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
      return;
    }
    const level = Number(value.slice(-1)) as
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6;
    editor.chain().focus().setHeading({ level }).run();
  }

  function changeSelectionCase(mode: TextCaseMode) {
    if (!editor) return;
    editor.commands.changeTextCase(mode);
    window.setTimeout(() => {
      if (!editor.isDestroyed) editor.view.focus();
    }, 0);
  }

  function insertLocalizedText(text: string) {
    if (!editor) return;
    editor.commands.insertContent(text);
    window.setTimeout(() => {
      if (!editor.isDestroyed) editor.view.focus();
    }, 0);
  }

  function chooseImage() {
    document.getElementById(imageInputId)?.click();
  }

  async function uploadImage(file: File, input: HTMLInputElement) {
    if (!editor) return;
    setUploadingImage(true);
    setImageError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(`/api/documents/${documentId}/images`, {
        method: "POST",
        body: formData,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || typeof body?.src !== "string") {
        throw new Error(
          typeof body?.error === "string"
            ? body.error
            : "Could not insert this image.",
        );
      }
      editor
        .chain()
        .focus()
        .setImage({ src: body.src, alt: body.alt ?? file.name })
        .run();
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : "Could not insert this image.",
      );
    } finally {
      setUploadingImage(false);
      input.value = "";
    }
  }

  const editingMenus =
    canEdit && editor
      ? {
          edit: [
            [
              {
                label: "History",
                children: [
                  {
                    label: "Undo",
                    shortcut: "Ctrl/⌘ + Z",
                    disabled: !editor.can().chain().undo().run(),
                    onSelect: () => editor.chain().focus().undo().run(),
                  },
                  {
                    label: "Redo",
                    shortcut: "Ctrl/⌘ + Shift + Z",
                    disabled: !editor.can().chain().redo().run(),
                    onSelect: () => editor.chain().focus().redo().run(),
                  },
                ],
              },
              {
                label: "Find and select",
                children: [
                  {
                    label: "Find and replace…",
                    shortcut: "Ctrl + H / ⌘ + Shift + H",
                    onSelect: () => setFindReplaceOpen(true),
                  },
                  {
                    label: "Select all",
                    shortcut: "Ctrl/⌘ + A",
                    onSelect: () => {
                      editor.commands.selectAll();
                      editor.commands.focus();
                    },
                  },
                ],
              },
              {
                label: "Blocks",
                children: [
                  {
                    label: "Duplicate current block",
                    onSelect: () =>
                      editor.chain().focus().duplicateCurrentBlock().run(),
                  },
                  {
                    label: "Move block up",
                    shortcut: "Alt + Shift + ↑",
                    disabled: !editor.can().moveCurrentBlockUp(),
                    onSelect: () =>
                      editor.chain().focus().moveCurrentBlockUp().run(),
                  },
                  {
                    label: "Move block down",
                    shortcut: "Alt + Shift + ↓",
                    disabled: !editor.can().moveCurrentBlockDown(),
                    onSelect: () =>
                      editor.chain().focus().moveCurrentBlockDown().run(),
                  },
                  {
                    label: "Insert paragraph above",
                    onSelect: () =>
                      editor.chain().focus().insertParagraphAbove().run(),
                  },
                  {
                    label: "Insert paragraph below",
                    onSelect: () =>
                      editor.chain().focus().insertParagraphBelow().run(),
                  },
                  {
                    label: "Select current block",
                    onSelect: () =>
                      editor.chain().focus().selectCurrentBlock().run(),
                  },
                  {
                    label: "Delete current block",
                    onSelect: () =>
                      editor.chain().focus().deleteCurrentBlock().run(),
                  },
                  {
                    label: "Merge with previous block",
                    disabled: !editor.can().mergeCurrentBlockWithPrevious(),
                    onSelect: () =>
                      editor.chain().focus().mergeCurrentBlockWithPrevious().run(),
                  },
                  {
                    label: "Merge with next block",
                    disabled: !editor.can().mergeCurrentBlockWithNext(),
                    onSelect: () =>
                      editor.chain().focus().mergeCurrentBlockWithNext().run(),
                  },
                ],
              },
            ],
          ],
          insert: [
            [
              {
                label: "Links and references",
                children: [
                  {
                    label: "Link…",
                    shortcut: "Ctrl/⌘ + K",
                    onSelect: () =>
                      document.getElementById(linkControlId)?.click(),
                  },
                  {
                    label: "Bookmark…",
                    onSelect: () => setBookmarkOpen(true),
                  },
                  {
                    label: "Footnote…",
                    onSelect: () => setFootnoteOpen(true),
                  },
                  {
                    label: "Table of contents",
                    onSelect: () => {
                      editor.commands.ensureHeadingAnchors();
                      editor.commands.insertTableOfContents();
                    },
                  },
                  {
                    label: "Update table of contents",
                    onSelect: () => editor.commands.refreshTableOfContents(),
                  },
                ],
              },
              {
                label: "Structure",
                children: [
                  {
                    label: "Horizontal line",
                    onSelect: () =>
                      editor.chain().focus().setHorizontalRule().run(),
                  },
                  {
                    label: "Page break",
                    shortcut: "Ctrl/⌘ + Enter",
                    onSelect: () => editor.chain().focus().setPageBreak().run(),
                  },
                  {
                    label: "Table (3 × 3)",
                    onSelect: () =>
                      editor
                        .chain()
                        .focus()
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run(),
                  },
                ],
              },
              {
                label: "Media",
                children: [
                  {
                    label: uploadingImage ? "Inserting image…" : "Image…",
                    disabled: uploadingImage,
                    onSelect: chooseImage,
                  },
                ],
              },
              {
                label: "Date and time",
                children: [
                  {
                    label: "Current date",
                    onSelect: () =>
                      insertLocalizedText(
                        new Intl.DateTimeFormat(undefined, {
                          dateStyle: "long",
                        }).format(new Date()),
                      ),
                  },
                  {
                    label: "Current time",
                    onSelect: () =>
                      insertLocalizedText(
                        new Intl.DateTimeFormat(undefined, {
                          timeStyle: "short",
                        }).format(new Date()),
                      ),
                  },
                ],
              },
              {
                label: "Special characters",
                children: [
                  {
                    label: "Em dash —",
                    onSelect: () => insertLocalizedText("—"),
                  },
                  {
                    label: "En dash –",
                    onSelect: () => insertLocalizedText("–"),
                  },
                  {
                    label: "Ellipsis …",
                    onSelect: () => insertLocalizedText("…"),
                  },
                  {
                    label: "Non-breaking space",
                    onSelect: () => insertLocalizedText("\u00a0"),
                  },
                ],
              },
            ],
          ],
          format: [
            [
              {
                label: "Text",
                children: [
                  { label: "Bold", shortcut: "Ctrl/⌘ + B", onSelect: () => editor.chain().focus().toggleBold().run() },
                  { label: "Italic", shortcut: "Ctrl/⌘ + I", onSelect: () => editor.chain().focus().toggleItalic().run() },
                  { label: "Underline", shortcut: "Ctrl/⌘ + U", onSelect: () => editor.chain().focus().toggleUnderline().run() },
                  { label: "Strikethrough", onSelect: () => editor.chain().focus().toggleStrike().run() },
                  { label: "Highlight", onSelect: () => editor.chain().focus().toggleHighlight().run() },
                  { label: "Inline code", shortcut: "Ctrl/⌘ + E", onSelect: () => editor.chain().focus().toggleCode().run() },
                  { label: "Superscript", shortcut: "Ctrl/⌘ + .", onSelect: () => editor.chain().focus().toggleSuperscript().run() },
                  { label: "Subscript", shortcut: "Ctrl/⌘ + ,", onSelect: () => editor.chain().focus().toggleSubscript().run() },
                  { label: "Clear formatting", shortcut: "Ctrl/⌘ + \\", onSelect: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
                ],
              },
              {
                label: "Paragraph style",
                children: [
                  { label: "Normal text", onSelect: () => editor.chain().focus().setParagraph().run() },
                  ...HEADING_LEVELS.map((level) => ({
                    label: `Heading ${level}`,
                    onSelect: () => editor.chain().focus().setHeading({ level }).run(),
                  })),
                ],
              },
              {
                label: "Lists and blocks",
                children: [
                  { label: "Bulleted list", onSelect: () => editor.chain().focus().toggleBulletList().run() },
                  { label: "Numbered list", onSelect: () => editor.chain().focus().toggleOrderedList().run() },
                  { label: "Checklist", onSelect: () => editor.chain().focus().toggleTaskList().run() },
                  { label: "Block quote", onSelect: () => editor.chain().focus().toggleBlockquote().run() },
                  { label: "Code block", onSelect: () => editor.chain().focus().toggleCodeBlock().run() },
                ],
              },
              {
                label: "Alignment",
                children: [
                  { label: "Align left", shortcut: "Ctrl/⌘ + Shift + L", onSelect: () => editor.chain().focus().setTextAlign("left").run() },
                  { label: "Align center", shortcut: "Ctrl/⌘ + Shift + E", onSelect: () => editor.chain().focus().setTextAlign("center").run() },
                  { label: "Align right", shortcut: "Ctrl/⌘ + Shift + R", onSelect: () => editor.chain().focus().setTextAlign("right").run() },
                  { label: "Justify", shortcut: "Ctrl/⌘ + Shift + J", onSelect: () => editor.chain().focus().setTextAlign("justify").run() },
                ],
              },
              {
                label: "Indentation",
                children: [
                  { label: "Increase indent", shortcut: "Ctrl/⌘ + ]", onSelect: () => editor.chain().focus().increaseTextIndent().run() },
                  { label: "Decrease indent", shortcut: "Ctrl/⌘ + [", onSelect: () => editor.chain().focus().decreaseTextIndent().run() },
                ],
              },
              {
                label: "Text direction",
                children: [
                  { label: `Left to right${documentPreferences?.direction === "ltr" ? " ✓" : ""}`, onSelect: () => editor.commands.setDocumentDirection("ltr") },
                  { label: `Right to left${documentPreferences?.direction === "rtl" ? " ✓" : ""}`, onSelect: () => editor.commands.setDocumentDirection("rtl") },
                ],
              },
              {
                label: "Line and paragraph spacing",
                children: [
                  ...LINE_HEIGHT_OPTIONS.map((lineHeight) => ({
                    label: `${lineHeight === 1 ? "Single" : lineHeight} line spacing${activeBlockAttributes?.lineHeight === lineHeight ? " ✓" : ""}`,
                    onSelect: () => editor.chain().focus().setParagraphLineHeight(lineHeight).run(),
                  })),
                  {
                    label: `${Number(activeBlockAttributes?.spaceBefore) > 0 ? "Remove" : "Add"} space before paragraph`,
                    onSelect: () => editor.chain().focus().setParagraphSpaceBefore(Number(activeBlockAttributes?.spaceBefore) > 0 ? 0 : 0.75).run(),
                  },
                  {
                    label: `${Number(activeBlockAttributes?.spaceAfter) > 0 ? "Remove" : "Add"} space after paragraph`,
                    onSelect: () => editor.chain().focus().setParagraphSpaceAfter(Number(activeBlockAttributes?.spaceAfter) > 0 ? 0 : 0.75).run(),
                  },
                ],
              },
              {
                label: "Capitalization",
                children: [
                  { label: "UPPERCASE", onSelect: () => changeSelectionCase("uppercase") },
                  { label: "lowercase", onSelect: () => changeSelectionCase("lowercase") },
                  { label: "Title Case", onSelect: () => changeSelectionCase("title") },
                  { label: "Sentence case", onSelect: () => changeSelectionCase("sentence") },
                  { label: "tOGGLE cASE", onSelect: () => changeSelectionCase("toggle") },
                ],
              },
            ],
          ],
        }
      : null;

  return (
    <>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div
        role="menubar"
        aria-label="Document menus"
        onKeyDown={handleMenuBarKeyDown}
        className={`flex items-center gap-0.5 px-2 py-1 ${canEdit && editor ? "border-b border-[var(--border)]" : ""}`}
      >
        <DocumentFileMenu
          documentId={documentId}
          currentRevision={currentRevision}
          canImport={canEdit}
          canViewHistory={canViewHistory}
          canChangeLanguage={canEdit && !!documentPreferences}
          documentLanguage={documentPreferences?.language ?? "en-US"}
          languageOptions={DOCUMENT_LANGUAGE_OPTIONS}
          onImport={onImport}
          onConflict={onConflict}
          onLanguageChange={(language) =>
            editor?.commands.setDocumentLanguage(language)
          }
        />
        {editingMenus ? (
          <EditorMenu label="Edit" groups={editingMenus.edit} />
        ) : null}
        <EditorMenu
          label="View"
          groups={[
            [
              {
                label: "Panels",
                children: [
                  {
                    label: commentsOpen ? "Hide comments" : "Show comments",
                    shortcut: "Ctrl/⌘ + Alt + Shift + A",
                    onSelect: onToggleComments,
                  },
                  {
                    label: outlineOpen
                      ? "Hide document outline"
                      : "Show document outline",
                    onSelect: onToggleOutline,
                  },
                ],
              },
              {
                label: "Zoom",
                children: DOCUMENT_ZOOM_OPTIONS.map((nextZoom) => ({
                  label: `${nextZoom}%${zoom === nextZoom ? " ✓" : ""}`,
                  onSelect: () => onZoomChange(nextZoom),
                })),
              },
              ...(editor
                ? [
                    {
                      label: "Navigate",
                      children: [
                        { label: "Document start", shortcut: "Ctrl/⌘ + Home", onSelect: () => editor.commands.goToDocumentStart() },
                        { label: "Document end", shortcut: "Ctrl/⌘ + End", onSelect: () => editor.commands.goToDocumentEnd() },
                        { label: "Previous heading", shortcut: "Alt + Shift + Page Up", disabled: !editor.can().goToPreviousHeading(), onSelect: () => editor.commands.goToPreviousHeading() },
                        { label: "Next heading", shortcut: "Alt + Shift + Page Down", disabled: !editor.can().goToNextHeading(), onSelect: () => editor.commands.goToNextHeading() },
                        { label: "Previous paragraph", disabled: !editor.can().goToPreviousParagraph(), onSelect: () => editor.commands.goToPreviousParagraph() },
                        { label: "Next paragraph", disabled: !editor.can().goToNextParagraph(), onSelect: () => editor.commands.goToNextParagraph() },
                        { label: "Previous table", disabled: !editor.can().goToPreviousTable(), onSelect: () => editor.commands.goToPreviousTable() },
                        { label: "Next table", disabled: !editor.can().goToNextTable(), onSelect: () => editor.commands.goToNextTable() },
                      ],
                    },
                  ]
                : []),
            ],
          ]}
        />
        {editingMenus ? (
          <>
            <EditorMenu label="Insert" groups={editingMenus.insert} />
            <EditorMenu label="Format" groups={editingMenus.format} />
          </>
        ) : null}
        {editor ? (
          <EditorMenu
            label="Tools"
            groups={[
              [
                ...(canEdit
                  ? [
                      {
                        label: "Thido",
                        children: [
                          {
                            label: "Edit with Thido",
                            onSelect: onEditWithAi,
                          },
                        ],
                      },
                    ]
                  : []),
                {
                  label: "Document insights",
                  children: [
                    {
                      label: "Document statistics",
                      shortcut: "Ctrl/⌘ + Shift + C",
                      onSelect: () => setWordCountOpen(true),
                    },
                  ],
                },
                ...(canEdit && documentPreferences
                  ? [
                      {
                        label: "Spelling",
                        children: [
                          {
                            label: `${documentPreferences.spellcheck ? "Disable" : "Enable"} spelling suggestions`,
                            onSelect: () =>
                              editor.commands.setDocumentSpellcheck(
                                !documentPreferences.spellcheck,
                              ),
                          },
                        ],
                      },
                    ]
                  : []),
                ...(canEdit
                  ? [
                    {
                      label: "Clean up text",
                      children: [
                        {
                          label: "Whitespace",
                          children: [
                            { label: "Collapse repeated spaces", onSelect: () => editor.chain().focus().cleanUpText("collapseSpaces").run() },
                            { label: "Convert tabs to spaces", onSelect: () => editor.chain().focus().cleanUpText("tabsToSpaces").run() },
                            { label: "Remove zero-width characters", onSelect: () => editor.chain().focus().cleanUpText("removeZeroWidth").run() },
                            { label: "Remove soft hyphens", onSelect: () => editor.chain().focus().cleanUpText("removeSoftHyphens").run() },
                            { label: "Replace non-breaking spaces", onSelect: () => editor.chain().focus().cleanUpText("replaceNonBreakingSpaces").run() },
                            { label: "Normalize Unicode spaces", onSelect: () => editor.chain().focus().cleanUpText("normalizeUnicodeSpaces").run() },
                          ],
                        },
                        {
                          label: "Typography",
                          children: [
                            { label: "Convert to smart quotes", onSelect: () => editor.chain().focus().cleanUpText("smartQuotes").run() },
                            { label: "Convert to straight quotes", onSelect: () => editor.chain().focus().cleanUpText("straightQuotes").run() },
                            { label: "Convert double hyphens to em dashes", onSelect: () => editor.chain().focus().cleanUpText("normalizeDashes").run() },
                            { label: "Convert three periods to ellipses", onSelect: () => editor.chain().focus().cleanUpText("normalizeEllipses").run() },
                          ],
                        },
                      ],
                    },
                  ]
                  : []),
              ],
            ]}
          />
        ) : null}
      </div>

      <input
        id={imageInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="sr-only"
        aria-label="Choose an image"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void uploadImage(file, event.currentTarget);
        }}
      />

      {canEdit && editor ? (
        <div
          role="toolbar"
          aria-label="Formatting toolbar"
          className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5"
        >
          <button
            type="button"
            onClick={onEditWithAi}
            className="mr-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[var(--foreground)] px-3 text-xs font-semibold text-[var(--background)] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)]"
            aria-label="Edit with Thido"
            title="Ask Thido to add, remove, or rewrite document content"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-4"
            >
              <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" />
              <path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
            </svg>
            Edit with Thido
          </button>
          <ToolbarButton
            label="Undo"
            onClick={() => editor.chain().focus().undo().run()}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.8">
              <path d="M9 7 4.5 11 9 15M5 11h8a6 6 0 0 1 6 6" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            onClick={() => editor.chain().focus().redo().run()}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.8">
              <path d="m15 7 4.5 4-4.5 4M19 11h-8a6 6 0 0 0-6 6" />
            </svg>
          </ToolbarButton>
          <ToolbarSeparator />
          <select
            value={activeBlockStyle}
            onChange={(event) => setBlockStyle(event.target.value)}
            aria-label="Paragraph style"
            title="Paragraph style"
            className="app-input h-8 w-32 shrink-0 rounded-sm px-2 text-sm outline-none"
          >
            <option value="paragraph">Normal text</option>
            {HEADING_LEVELS.map((level) => (
              <option key={level} value={`heading-${level}`}>
                Heading {level}
              </option>
            ))}
          </select>
          <select
            value={String(activeTextStyle.fontFamily ?? "")}
            onChange={(event) =>
              editor
                .chain()
                .focus()
                .setFontFamily(event.target.value || null)
                .run()
            }
            aria-label="Font family"
            title="Font family"
            className="app-input h-8 w-28 shrink-0 rounded-sm px-2 text-sm outline-none"
          >
            {FONT_FAMILY_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={String(activeTextStyle.fontSize ?? "")}
            onChange={(event) =>
              editor
                .chain()
                .focus()
                .setFontSize(event.target.value ? Number(event.target.value) : null)
                .run()
            }
            aria-label="Font size"
            title="Font size"
            className="app-input h-8 w-20 shrink-0 rounded-sm px-2 text-sm outline-none"
          >
            <option value="">Default</option>
            {FONT_SIZE_OPTIONS.map((fontSize) => (
              <option key={fontSize} value={fontSize}>
                {fontSize} pt
              </option>
            ))}
          </select>
          <select
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            aria-label="Document zoom"
            title="Document zoom"
            className="app-input h-8 w-20 shrink-0 rounded-sm px-2 text-sm outline-none"
          >
            {DOCUMENT_ZOOM_OPTIONS.map((zoomOption) => (
              <option key={zoomOption} value={zoomOption}>
                {zoomOption}%
              </option>
            ))}
          </select>
          <select
            value={String(activeTextStyle.color ?? "")}
            onChange={(event) =>
              editor
                .chain()
                .focus()
                .setTextColor(event.target.value || null)
                .run()
            }
            aria-label="Text color"
            title="Text color"
            className="app-input h-8 w-24 shrink-0 rounded-sm px-2 text-sm outline-none"
          >
            {TEXT_COLOR_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={String(activeHighlight.color ?? "")}
            onChange={(event) => {
              const color = event.target.value;
              const chain = editor.chain().focus();
              if (color) chain.setHighlight({ color }).run();
              else chain.unsetHighlight().run();
            }}
            aria-label="Highlight color"
            title="Highlight color"
            className="app-input h-8 w-28 shrink-0 rounded-sm px-2 text-sm outline-none"
          >
            {HIGHLIGHT_COLOR_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ToolbarSeparator />
          <ToolbarButton
            label="Bold"
            isActive={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            isActive={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            isActive={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="underline underline-offset-2">U</span>
          </ToolbarButton>
          <ToolbarButton
            label="Strikethrough"
            isActive={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <span className="line-through">S</span>
          </ToolbarButton>
          <ToolbarSeparator />
          <LinkControl editor={editor} triggerId={linkControlId} />
          <ToolbarSeparator />
          <ToolbarButton
            label="Bulleted list"
            isActive={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <span aria-hidden="true" className="flex items-center gap-1 font-mono">
              <span>•</span><span>☰</span>
            </span>
          </ToolbarButton>
          <select
            value={activeBulletStyle}
            onChange={(event) => {
              const bulletStyle = event.target.value;
              if (isBulletStyle(bulletStyle)) setBulletStyle(bulletStyle);
            }}
            aria-label="Bullet style"
            title="Bullet style"
            className="app-input h-8 w-16 shrink-0 rounded-sm px-1 text-sm outline-none"
          >
            {BULLET_STYLES.map((bulletStyle) => (
              <option key={bulletStyle} value={bulletStyle}>
                {bulletStyleLabels[bulletStyle]}
              </option>
            ))}
          </select>
          <ToolbarButton
            label="Numbered list"
            isActive={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <span aria-hidden="true" className="flex items-center gap-1 font-mono text-xs">
              <span>1.</span><span>☰</span>
            </span>
          </ToolbarButton>
          <ToolbarButton
            label="Checklist"
            isActive={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <span aria-hidden="true" className="flex items-center gap-1 font-mono text-xs">
              <span>☑</span><span>☰</span>
            </span>
          </ToolbarButton>
          <ToolbarButton
            label="Block quote"
            isActive={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <span aria-hidden="true" className="text-lg leading-none">“</span>
          </ToolbarButton>
          {imageError ? (
            <p role="alert" className="ml-2 shrink-0 text-xs text-[var(--danger)]">
              {imageError}
            </p>
          ) : null}
        </div>
      ) : null}
      </div>
      {findReplaceOpen && editor ? (
        <FindReplaceDialog
          editor={editor}
          onClose={() => setFindReplaceOpen(false)}
        />
      ) : null}
      {wordCountOpen && editor ? (
        <WordCountDialog
          editor={editor}
          onClose={() => setWordCountOpen(false)}
        />
      ) : null}
      {footnoteOpen && editor ? (
        <FootnoteDialog
          onInsert={(text) => editor.commands.insertFootnote(text)}
          onClose={() => setFootnoteOpen(false)}
        />
      ) : null}
      {bookmarkOpen && editor ? (
        <BookmarkDialog
          mode="insert"
          onSubmit={(label) => editor.commands.insertBookmark(label)}
          onClose={() => setBookmarkOpen(false)}
        />
      ) : null}
    </>
  );
}
