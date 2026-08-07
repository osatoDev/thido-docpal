"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

import { DocumentFileMenu } from "@/components/documents/DocumentMoreActions";
import type { RestoredDocument } from "@/components/documents/VersionHistoryControl";
import { FindReplaceDialog } from "./FindReplaceDialog";
import { LinkControl } from "./LinkControl";
import { WordCountDialog } from "./WordCountDialog";
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

type MenuItem = {
  label: string;
  onSelect: () => void;
  shortcut?: string;
  disabled?: boolean;
};

function EditorMenu({
  label,
  groups,
}: {
  label: string;
  groups: readonly (readonly MenuItem[])[];
}) {
  const [open, setOpen] = useState(false);
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
          className="app-panel absolute top-full left-0 z-40 mt-1 w-64 rounded-md p-1.5 text-sm shadow-lg"
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
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onSelect();
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-4 rounded-sm px-3 py-2 text-left hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span>{item.label}</span>
                  {item.shortcut ? (
                    <kbd className="shrink-0 font-sans text-xs font-normal text-[var(--muted)]">
                      {item.shortcut}
                    </kbd>
                  ) : null}
                </button>
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
  onToggleComments,
  onImport,
  onConflict,
}: {
  editor: Editor | null;
  documentId: string;
  currentRevision: number;
  canEdit: boolean;
  canViewHistory: boolean;
  commentsOpen: boolean;
  onToggleComments: () => void;
  onImport: (document: RestoredDocument) => void;
  onConflict: (message: string) => void;
}) {
  const imageInputId = useId();
  const linkControlId = useId();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [wordCountOpen, setWordCountOpen] = useState(false);
  const activeBulletStyle =
    editor && isBulletStyle(editor.getAttributes("bulletList").bulletStyle)
      ? (editor.getAttributes("bulletList").bulletStyle as BulletStyle)
      : "disc";
  const activeBlockStyle = editor?.isActive("heading", { level: 1 })
    ? "heading-1"
    : editor?.isActive("heading", { level: 2 })
      ? "heading-2"
      : editor?.isActive("heading", { level: 3 })
        ? "heading-3"
        : "paragraph";

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
    const level = Number(value.slice(-1)) as 1 | 2 | 3;
    editor.chain().focus().setHeading({ level }).run();
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
            [
              {
                label: "Find and replace…",
                shortcut: "Ctrl + H / ⌘ + Shift + H",
                onSelect: () => setFindReplaceOpen(true),
              },
            ],
          ],
          insert: [
            [
              {
                label: "Link…",
                shortcut: "Ctrl/⌘ + K",
                onSelect: () =>
                  document.getElementById(linkControlId)?.click(),
              },
              {
                label: "Horizontal line",
                onSelect: () =>
                  editor.chain().focus().setHorizontalRule().run(),
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
              {
                label: uploadingImage ? "Inserting image…" : "Image…",
                disabled: uploadingImage,
                onSelect: chooseImage,
              },
            ],
          ],
          format: [
            [
              {
                label: "Normal text",
                onSelect: () => editor.chain().focus().setParagraph().run(),
              },
              ...([1, 2, 3] as const).map((level) => ({
                label: `Heading ${level}`,
                onSelect: () =>
                  editor.chain().focus().setHeading({ level }).run(),
              })),
            ],
            [
              {
                label: "Bulleted list",
                onSelect: () => editor.chain().focus().toggleBulletList().run(),
              },
              {
                label: "Numbered list",
                onSelect: () => editor.chain().focus().toggleOrderedList().run(),
              },
              {
                label: "Checklist",
                onSelect: () => editor.chain().focus().toggleTaskList().run(),
              },
              {
                label: "Block quote",
                onSelect: () => editor.chain().focus().toggleBlockquote().run(),
              },
            ],
            [
              {
                label: "Clear formatting",
                shortcut: "Ctrl/⌘ + \\",
                onSelect: () =>
                  editor.chain().focus().unsetAllMarks().clearNodes().run(),
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
          onImport={onImport}
          onConflict={onConflict}
        />
        {editingMenus ? (
          <EditorMenu label="Edit" groups={editingMenus.edit} />
        ) : null}
        <EditorMenu
          label="View"
          groups={[
            [
              {
                label: commentsOpen ? "Hide comments" : "Show comments",
                shortcut: "Ctrl/⌘ + Alt + Shift + A",
                onSelect: onToggleComments,
              },
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
                {
                  label: "Word count",
                  shortcut: "Ctrl/⌘ + Shift + C",
                  onSelect: () => setWordCountOpen(true),
                },
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
            <option value="heading-1">Heading 1</option>
            <option value="heading-2">Heading 2</option>
            <option value="heading-3">Heading 3</option>
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
    </>
  );
}
