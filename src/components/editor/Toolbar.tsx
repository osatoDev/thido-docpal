"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

import { DocumentFileMenu } from "@/components/documents/DocumentMoreActions";
import type { RestoredDocument } from "@/components/documents/VersionHistoryControl";
import { Tooltip } from "@/components/Tooltip";
import { EditorMenu } from "./EditorMenu";
import { BookmarkDialog } from "./BookmarkDialog";
import { CustomBulletDialog } from "./CustomBulletDialog";
import { FindReplaceDialog } from "./FindReplaceDialog";
import { FootnoteDialog } from "./FootnoteDialog";
import { LinkControl } from "./LinkControl";
import { WordCountDialog } from "./WordCountDialog";
import {
  DOCUMENT_LANGUAGE_OPTIONS,
  DOCUMENT_SIDE_MARGIN_OPTIONS,
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
  normalizeCustomBulletGlyph,
  type BulletStyle,
} from "./extensions/StyledBulletList";
import {
  TASK_STYLES,
  type TaskStyle,
} from "./extensions/StyledTaskList";

const bulletStyleLabels: Record<BulletStyle, string> = {
  disc: "● Disc",
  circle: "○ Circle",
  square: "■ Square",
  diamond: "◆ Diamond",
  arrow: "➤ Arrow",
  star: "★ Star",
  check: "✓ Check",
  dash: "– Dash",
  custom: "Custom…",
};
const taskStyleLabels: Record<TaskStyle, string> = {
  plain: "No strikethrough",
  strike: "Strikethrough when checked",
};
const DOCUMENT_ZOOM_OPTIONS = [75, 100, 125, 150] as const;
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;
const TEXT_COLOR_OPTIONS = [
  { label: "Theme color", value: "" },
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
    <Tooltip label={label} className="inline-flex shrink-0">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-sm hover:bg-[var(--surface-subtle)] ${
          isActive
            ? "bg-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)] text-[var(--accent-strong)]"
            : ""
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-[var(--border)]" />;
}

function useCloseOnOutsideOrEscape(
  open: boolean,
  onClose: () => void,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, containerRef]);
}

type ToolbarMenuOption = {
  label: string;
  isActive?: boolean;
  onSelect: () => void;
};

function ToolbarOptionList({
  options,
  onClose,
}: {
  options: readonly ToolbarMenuOption[];
  onClose: () => void;
}) {
  return (
    <div className="grid gap-0.5">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          role="menuitemradio"
          aria-checked={option.isActive}
          onClick={() => {
            option.onSelect();
            onClose();
          }}
          className={`flex w-full items-center justify-between gap-4 rounded-sm px-2.5 py-1.5 text-left hover:bg-[var(--surface-subtle)] ${
            option.isActive ? "font-semibold" : ""
          }`}
        >
          {option.label}
          {option.isActive ? <span aria-hidden="true">✓</span> : null}
        </button>
      ))}
    </div>
  );
}

function DropdownChevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3 shrink-0 fill-none stroke-current"
      strokeWidth="1.8"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

/** A single button whose whole hit area opens a dropdown of mutually exclusive options (no separate default action). */
function ToolbarMenuButton({
  label,
  icon,
  options,
}: {
  label: string;
  icon: React.ReactNode;
  options: readonly ToolbarMenuOption[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useCloseOnOutsideOrEscape(open, close, containerRef);

  return (
    <div ref={containerRef} className="relative inline-flex shrink-0">
      <Tooltip label={label} className="inline-flex shrink-0">
        <button
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-sm px-1.5 text-sm hover:bg-[var(--surface-subtle)]"
        >
          {icon}
          <DropdownChevron />
        </button>
      </Tooltip>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          className="app-panel absolute left-0 top-full z-40 mt-1 min-w-44 rounded-md p-1 text-sm shadow-lg"
        >
          <ToolbarOptionList options={options} onClose={close} />
        </div>
      ) : null}
    </div>
  );
}

/** An icon button that performs a default action on click, plus a chevron that opens style variants. */
function ToolbarSplitButton({
  label,
  icon,
  isActive,
  onClick,
  options,
}: {
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
  options: readonly ToolbarMenuOption[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useCloseOnOutsideOrEscape(open, close, containerRef);

  return (
    <div ref={containerRef} className="relative inline-flex shrink-0">
      <div
        className={`inline-flex items-stretch overflow-hidden rounded-sm ${
          isActive
            ? "bg-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)] text-[var(--accent-strong)]"
            : ""
        }`}
      >
        <Tooltip label={label} className="inline-flex shrink-0">
          <button
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            onClick={onClick}
            className={`inline-flex size-8 shrink-0 items-center justify-center text-sm ${
              isActive ? "" : "hover:bg-[var(--surface-subtle)]"
            }`}
          >
            {icon}
          </button>
        </Tooltip>
        <button
          type="button"
          aria-label={`${label} options`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={`inline-flex w-4 shrink-0 items-center justify-center ${
            isActive ? "" : "hover:bg-[var(--surface-subtle)]"
          }`}
        >
          <DropdownChevron />
        </button>
      </div>
      {open ? (
        <div
          role="menu"
          aria-label={`${label} options`}
          className="app-panel absolute left-0 top-full z-40 mt-1 min-w-44 rounded-md p-1 text-sm shadow-lg"
        >
          <ToolbarOptionList options={options} onClose={close} />
        </div>
      ) : null}
    </div>
  );
}

/** An "A"/pen-style button showing a color swatch, opening a palette of color choices. */
function ToolbarColorButton({
  label,
  icon,
  swatchColor,
  options,
  activeValue,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  swatchColor: string;
  options: readonly { label: string; value: string }[];
  activeValue: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useCloseOnOutsideOrEscape(open, close, containerRef);

  return (
    <div ref={containerRef} className="relative inline-flex shrink-0">
      <Tooltip label={label} className="inline-flex shrink-0">
        <button
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex size-8 shrink-0 flex-col items-center justify-center gap-0.5 rounded-sm pb-1 hover:bg-[var(--surface-subtle)]"
        >
          {icon}
          <span
            aria-hidden="true"
            className="h-1 w-4 rounded-full border border-[var(--border)]"
            style={{ background: swatchColor }}
          />
        </button>
      </Tooltip>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          className="app-panel absolute left-0 top-full z-40 mt-1 w-40 rounded-md p-2 shadow-lg"
        >
          <div className="grid grid-cols-5 gap-1.5">
            {options.map((option) => (
              <button
                key={option.label}
                type="button"
                role="menuitemradio"
                aria-checked={activeValue === option.value}
                aria-label={option.label}
                title={option.label}
                onClick={() => {
                  onSelect(option.value);
                  close();
                }}
                className={`size-6 shrink-0 rounded-full border ${
                  activeValue === option.value
                    ? "border-[var(--accent-strong)] ring-2 ring-[var(--accent-strong)]"
                    : "border-[var(--border)]"
                }`}
                style={{ background: option.value || "transparent" }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AlignmentIcon({
  align,
}: {
  align: "left" | "center" | "right" | "justify";
}) {
  const widths = align === "justify" ? [16, 16, 16, 16] : [16, 11, 16, 8];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 stroke-current"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      {widths.map((width, index) => {
        const y = 6 + index * 4;
        const x =
          align === "right" ? 20 - width : align === "center" ? 12 - width / 2 : 4;
        return <line key={y} x1={x} y1={y} x2={x + width} y2={y} />;
      })}
    </svg>
  );
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
  const [customBulletOpen, setCustomBulletOpen] = useState(false);
  const [footnoteOpen, setFootnoteOpen] = useState(false);
  const [wordCountOpen, setWordCountOpen] = useState(false);
  const [, setEditorVersion] = useState(0);
  const activeBulletGlyph = editor
    ? normalizeCustomBulletGlyph(
        editor.getAttributes("bulletList").bulletGlyph,
      )
    : null;
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
  const activeAlignment =
    (["left", "center", "right", "justify"] as const).find((align) =>
      editor?.isActive({ textAlign: align }),
    ) ?? "left";
  const displayFontSize =
    typeof activeTextStyle.fontSize === "number" ? activeTextStyle.fontSize : 11;
  const [fontSizeDraft, setFontSizeDraft] = useState<string | null>(null);
  const fontSizeInputValue = fontSizeDraft ?? String(displayFontSize);

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

  function setBulletStyle(bulletStyle: BulletStyle, bulletGlyphValue?: string) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (!editor.isActive("bulletList")) chain.toggleBulletList();
    chain
      .updateAttributes("bulletList", {
        bulletStyle,
        bulletGlyph:
          bulletStyle === "custom"
            ? normalizeCustomBulletGlyph(bulletGlyphValue)
            : null,
      })
      .run();
  }

  function setTaskStyle(taskStyle: TaskStyle) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (!editor.isActive("taskList")) chain.toggleTaskList();
    chain.updateAttributes("taskList", { taskStyle }).run();
  }

  function applyFontSize(size: number) {
    if (!editor) return;
    const clamped = Math.min(96, Math.max(6, Math.round(size)));
    editor.chain().focus().setFontSize(clamped).run();
    setFontSizeDraft(null);
  }

  function stepFontSize(direction: 1 | -1) {
    applyFontSize(displayFontSize + direction);
  }

  function commitFontSizeInput() {
    const parsed = Number(fontSizeDraft);
    if (fontSizeDraft != null && Number.isFinite(parsed) && parsed > 0) {
      applyFontSize(parsed);
    } else {
      setFontSizeDraft(null);
    }
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
                label: "Table (3 × 3)",
                onSelect: () =>
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run(),
              },
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
                    label: "Em dash",
                    onSelect: () => insertLocalizedText("\u2014"),
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
                label: "Typography and color",
                children: [
                  {
                    label: "Font family",
                    children: FONT_FAMILY_OPTIONS.map((option) => ({
                      label: `${option.label}${String(activeTextStyle.fontFamily ?? "") === option.value ? " ✓" : ""}`,
                      onSelect: () =>
                        editor
                          .chain()
                          .focus()
                          .setFontFamily(option.value || null)
                          .run(),
                    })),
                  },
                  {
                    label: "Font size",
                    children: [
                      {
                        label: `Body size${activeTextStyle.fontSize == null ? " ✓" : ""}`,
                        onSelect: () =>
                          editor.chain().focus().setFontSize(null).run(),
                      },
                      ...FONT_SIZE_OPTIONS.map((fontSize) => ({
                        label: `${fontSize} pt${activeTextStyle.fontSize === fontSize ? " ✓" : ""}`,
                        onSelect: () =>
                          editor.chain().focus().setFontSize(fontSize).run(),
                      })),
                    ],
                  },
                  {
                    label: "Text color",
                    children: TEXT_COLOR_OPTIONS.map((option) => ({
                      label: `${option.label}${String(activeTextStyle.color ?? "") === option.value ? " ✓" : ""}`,
                      onSelect: () =>
                        editor
                          .chain()
                          .focus()
                          .setTextColor(option.value || null)
                          .run(),
                    })),
                  },
                  {
                    label: "Highlight color",
                    children: HIGHLIGHT_COLOR_OPTIONS.map((option) => ({
                      label: `${option.label}${String(activeHighlight.color ?? "") === option.value ? " ✓" : ""}`,
                      onSelect: () => {
                        const chain = editor.chain().focus();
                        if (option.value) {
                          chain.setHighlight({ color: option.value }).run();
                        } else {
                          chain.unsetHighlight().run();
                        }
                      },
                    })),
                  },
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
                  {
                    label: "Bulleted list",
                    children: [
                      { label: "Toggle bulleted list", onSelect: () => editor.chain().focus().toggleBulletList().run() },
                      ...BULLET_STYLES.filter((style) => style !== "custom").map((style) => ({
                        label: `${bulletStyleLabels[style]}${editor.isActive("bulletList", { bulletStyle: style }) ? " ✓" : ""}`,
                        onSelect: () => setBulletStyle(style),
                      })),
                      { label: "Custom bullet…", onSelect: () => setCustomBulletOpen(true) },
                    ],
                  },
                  { label: "Numbered list", onSelect: () => editor.chain().focus().toggleOrderedList().run() },
                  {
                    label: "Checklist",
                    children: TASK_STYLES.map((style) => ({
                      label: `${taskStyleLabels[style]}${editor.isActive("taskList", { taskStyle: style }) ? " ✓" : ""}`,
                      onSelect: () => setTaskStyle(style),
                    })),
                  },
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
          <EditorMenu
            label="Edit"
            tooltip="Undo, find and replace, and block operations"
            groups={editingMenus.edit}
          />
        ) : null}
        <EditorMenu
          label="View"
          tooltip="Panels, zoom, side margins, and navigation"
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
                  ...(canEdit && editor
                    ? [
                        {
                          label: editor.isActive("heading")
                            ? editor.getAttributes("heading").outlineHidden === true
                              ? "Add current heading to outline"
                              : "Remove current heading from outline"
                            : "Remove current heading from outline",
                          disabled: !editor.isActive("heading"),
                          onSelect: () =>
                            editor.commands.setCurrentHeadingInOutline(
                              editor.getAttributes("heading").outlineHidden === true,
                            ),
                        },
                      ]
                    : []),
                ],
              },
              {
                label: "Zoom",
                children: DOCUMENT_ZOOM_OPTIONS.map((nextZoom) => ({
                  label: `${nextZoom}%${zoom === nextZoom ? " ✓" : ""}`,
                  onSelect: () => onZoomChange(nextZoom),
                })),
              },
              ...(canEdit && documentPreferences
                ? [
                    {
                      label: "Side margins",
                      children: DOCUMENT_SIDE_MARGIN_OPTIONS.map((option) => ({
                        label: `${option.label}${documentPreferences.sideMargin === option.value ? " ✓" : ""}`,
                        onSelect: () =>
                          editor?.commands.setDocumentSideMargin(option.value),
                      })),
                    },
                  ]
                : []),
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
            <EditorMenu
              label="Insert"
              tooltip="Tables, links, footnotes, media, and special characters"
              groups={editingMenus.insert}
            />
            <EditorMenu
              label="Format"
              tooltip="Text, typography, paragraph style, lists, and spacing"
              groups={editingMenus.format}
            />
          </>
        ) : null}
        {editor ? (
          <EditorMenu
            label="Tools"
            tooltip="Thido, document statistics, spelling, and text cleanup"
            groups={[
              [
                ...(canEdit
                  ? [
                      {
                        label: "Thido",
                        children: [
                          {
                            label: "Add comment",
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
          className="flex flex-wrap items-center gap-0.5 px-2 py-1.5"
        >
          <Tooltip
            label="Queue a comment for Thido on the selected text, or the whole document when nothing is selected"
            className="mr-1 inline-flex shrink-0"
          >
            <button
              type="button"
              onClick={onEditWithAi}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--foreground)] text-[var(--background)] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)]"
              aria-label="Add comment"
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
            </button>
          </Tooltip>
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
          <ToolbarButton label="Print" onClick={() => window.print()}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 8V4h10v4" />
              <rect x="4" y="8" width="16" height="8" rx="1.5" />
              <path d="M7 16v4h10v-4" />
            </svg>
          </ToolbarButton>
          {documentPreferences ? (
            <ToolbarButton
              label={`${documentPreferences.spellcheck ? "Disable" : "Enable"} spelling suggestions`}
              isActive={documentPreferences.spellcheck}
              onClick={() =>
                editor.commands.setDocumentSpellcheck(!documentPreferences.spellcheck)
              }
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15 7 6l3 9M5 12h4" />
                <path d="m14 13 3 3 5-6" />
              </svg>
            </ToolbarButton>
          ) : null}
          <Tooltip label="Zoom" className="inline-flex shrink-0">
            <select
              value={zoom}
              onChange={(event) => onZoomChange(Number(event.target.value))}
              aria-label="Zoom"
              className="app-input h-8 w-20 shrink-0 rounded-sm px-1.5 text-sm outline-none"
            >
              {DOCUMENT_ZOOM_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}%
                </option>
              ))}
            </select>
          </Tooltip>
          <ToolbarSeparator />
          <Tooltip label="Paragraph style" className="inline-flex shrink-0">
            <select
              value={activeBlockStyle}
              onChange={(event) => setBlockStyle(event.target.value)}
              aria-label="Paragraph style"
              className="app-input h-8 w-32 shrink-0 rounded-sm px-2 text-sm outline-none"
            >
              <option value="paragraph">Normal text</option>
              {HEADING_LEVELS.map((level) => (
                <option key={level} value={`heading-${level}`}>
                  Heading {level}
                </option>
              ))}
            </select>
          </Tooltip>
          <Tooltip label="Font family" className="inline-flex shrink-0">
            <select
              value={String(activeTextStyle.fontFamily ?? "")}
              onChange={(event) =>
                editor.chain().focus().setFontFamily(event.target.value || null).run()
              }
              aria-label="Font family"
              className="app-input h-8 w-32 shrink-0 rounded-sm px-2 text-sm outline-none"
            >
              {FONT_FAMILY_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Tooltip>
          <ToolbarSeparator />
          <div className="inline-flex shrink-0 items-center gap-0.5">
            <Tooltip label="Decrease font size" className="inline-flex shrink-0">
              <button
                type="button"
                aria-label="Decrease font size"
                onClick={() => stepFontSize(-1)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-sm hover:bg-[var(--surface-subtle)]"
              >
                −
              </button>
            </Tooltip>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Font size"
              value={fontSizeInputValue}
              onChange={(event) => setFontSizeDraft(event.target.value)}
              onBlur={commitFontSizeInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitFontSizeInput();
                }
              }}
              className="app-input h-8 w-11 shrink-0 rounded-sm px-1 text-center text-sm outline-none"
            />
            <Tooltip label="Increase font size" className="inline-flex shrink-0">
              <button
                type="button"
                aria-label="Increase font size"
                onClick={() => stepFontSize(1)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-sm hover:bg-[var(--surface-subtle)]"
              >
                +
              </button>
            </Tooltip>
          </div>
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
          <ToolbarColorButton
            label="Text color"
            icon={<span className="text-sm leading-none font-semibold">A</span>}
            swatchColor={String(activeTextStyle.color || "var(--foreground)")}
            options={TEXT_COLOR_OPTIONS}
            activeValue={String(activeTextStyle.color ?? "")}
            onSelect={(value) =>
              editor.chain().focus().setTextColor(value || null).run()
            }
          />
          <ToolbarColorButton
            label="Highlight color"
            icon={
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10.5 13.5 6-6 3 3-6 6-4 1 1-4Z" />
                <path d="M5 21h6l-1.5-3H6.5L5 21Z" />
              </svg>
            }
            swatchColor={String(activeHighlight.color || "transparent")}
            options={HIGHLIGHT_COLOR_OPTIONS}
            activeValue={String(activeHighlight.color ?? "")}
            onSelect={(value) => {
              const chain = editor.chain().focus();
              if (value) chain.setHighlight({ color: value }).run();
              else chain.unsetHighlight().run();
            }}
          />
          <ToolbarSeparator />
          <LinkControl editor={editor} triggerId={linkControlId} />
          <ToolbarButton label={uploadingImage ? "Inserting image…" : "Insert image"} onClick={chooseImage}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="14" rx="1.5" />
              <circle cx="9" cy="10" r="1.4" />
              <path d="m5.5 17 4.5-4.5 3 3 3.5-3.5 4 4" />
            </svg>
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarMenuButton
            label="Alignment"
            icon={<AlignmentIcon align={activeAlignment} />}
            options={(
              [
                { label: "Align left", value: "left" },
                { label: "Align center", value: "center" },
                { label: "Align right", value: "right" },
                { label: "Justify", value: "justify" },
              ] as const
            ).map((option) => ({
              label: option.label,
              isActive: activeAlignment === option.value,
              onSelect: () => editor.chain().focus().setTextAlign(option.value).run(),
            }))}
          />
          <ToolbarMenuButton
            label="Line spacing"
            icon={
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4v16M7 4 4 7M7 4l3 3M7 20l-3-3M7 20l3-3" />
                <path d="M12 6h8M12 12h8M12 18h8" />
              </svg>
            }
            options={LINE_HEIGHT_OPTIONS.map((lineHeight) => ({
              label: `${lineHeight === 1 ? "Single" : lineHeight} line spacing`,
              isActive: activeBlockAttributes?.lineHeight === lineHeight,
              onSelect: () =>
                editor.chain().focus().setParagraphLineHeight(lineHeight).run(),
            }))}
          />
          <ToolbarSplitButton
            label="Checklist"
            isActive={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            options={TASK_STYLES.map((style) => ({
              label: taskStyleLabels[style],
              isActive: editor.isActive("taskList", { taskStyle: style }),
              onSelect: () => setTaskStyle(style),
            }))}
            icon={
              <span aria-hidden="true" className="flex items-center gap-1 font-mono text-xs">
                <span>☑</span><span>☰</span>
              </span>
            }
          />
          <ToolbarSplitButton
            label="Bulleted list"
            isActive={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            options={[
              ...BULLET_STYLES.filter((style) => style !== "custom").map((style) => ({
                label: bulletStyleLabels[style],
                isActive: editor.isActive("bulletList", { bulletStyle: style }),
                onSelect: () => setBulletStyle(style),
              })),
              { label: "Custom…", onSelect: () => setCustomBulletOpen(true) },
            ]}
            icon={
              <span aria-hidden="true" className="flex items-center gap-1 font-mono">
                <span>•</span><span>☰</span>
              </span>
            }
          />
          <ToolbarButton
            label="Numbered list"
            isActive={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <span aria-hidden="true" className="flex items-center gap-1 font-mono text-xs">
              <span>1.</span><span>☰</span>
            </span>
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton
            label="Decrease indent"
            onClick={() => editor.chain().focus().decreaseTextIndent().run()}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M10 12h10M10 18h10" />
              <path d="m7 9-3 3 3 3" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            label="Increase indent"
            onClick={() => editor.chain().focus().increaseTextIndent().run()}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M10 12h10M10 18h10" />
              <path d="m4 9 3 3-3 3" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            label="Clear formatting"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.6" strokeLinecap="round">
              <path d="M5 5h9M9.5 5v13" />
              <path d="m14 19 6-9M14 10l6 9" />
            </svg>
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
      {customBulletOpen && editor ? (
        <CustomBulletDialog
          initialGlyph={activeBulletGlyph ?? ""}
          onSubmit={(glyph) => setBulletStyle("custom", glyph)}
          onClose={() => setCustomBulletOpen(false)}
        />
      ) : null}
    </>
  );
}
