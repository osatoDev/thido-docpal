"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { LinkControl } from "./LinkControl";
import { TableControl } from "./TableControl";
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
      className={`rounded-sm px-2 py-1 text-sm font-medium hover:bg-[var(--surface-subtle)] ${
        isActive ? "bg-[var(--foreground)] text-[var(--surface)]" : ""
      }`}
    >
      {children}
    </button>
  );
}

export function Toolbar({
  editor,
  documentId,
}: {
  editor: Editor | null;
  documentId: string;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  if (!editor) return null;
  const currentEditor = editor;
  const activeBulletStyle = isBulletStyle(
    editor.getAttributes("bulletList").bulletStyle,
  )
    ? (editor.getAttributes("bulletList").bulletStyle as BulletStyle)
    : "disc";

  function setBulletStyle(bulletStyle: BulletStyle) {
    const chain = currentEditor.chain().focus();
    if (!currentEditor.isActive("bulletList")) {
      chain.toggleBulletList();
    }
    chain.updateAttributes("bulletList", { bulletStyle }).run();
  }

  async function uploadImage(file: File) {
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
      currentEditor
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
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
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
      <span className="mx-1 h-5 w-px bg-[var(--border)]" />
      <ToolbarButton
        label="Heading 1"
        isActive={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        isActive={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-[var(--border)]" />
      <ToolbarButton
        label="Bullet list"
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <select
        value={editor.isActive("bulletList") ? activeBulletStyle : ""}
        onChange={(event) => {
          const bulletStyle = event.target.value;
          if (isBulletStyle(bulletStyle)) setBulletStyle(bulletStyle);
        }}
        aria-label="Bullet style"
        title="Bullet style"
        className="app-input rounded-sm px-2 py-1 text-sm outline-none"
      >
        <option value="" disabled>
          Bullet style
        </option>
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
        1. List
      </ToolbarButton>
      <ToolbarButton
        label="Checkbox list"
        isActive={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        ☐ Checkbox list
      </ToolbarButton>
      <ToolbarButton
        label="Blockquote"
        isActive={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        “ ”
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-[var(--border)]" />
      <LinkControl editor={editor} />
      <TableControl editor={editor} />
      <span className="mx-1 h-5 w-px bg-[var(--border)]" />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="sr-only"
        aria-label="Choose an image"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void uploadImage(file);
        }}
      />
      <button
        type="button"
        disabled={uploadingImage}
        onClick={() => imageInputRef.current?.click()}
        className="rounded-sm px-2 py-1 text-sm font-medium hover:bg-[var(--surface-subtle)] disabled:cursor-wait disabled:opacity-60"
        aria-label="Insert image"
        title="Insert image"
      >
        {uploadingImage ? "Inserting image…" : "Insert image"}
      </button>
      <span className="mx-1 h-5 w-px bg-[var(--border)]" />
      <ToolbarButton
        label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↺
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↻
      </ToolbarButton>
      {imageError && (
        <p role="alert" className="ml-2 text-xs text-[var(--danger)]">
          {imageError}
        </p>
      )}
    </div>
  );
}
