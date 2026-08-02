"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

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
          typeof body?.error === "string" ? body.error : "Could not add this photo.",
        );
      }
      currentEditor
        .chain()
        .focus()
        .setImage({ src: body.src, alt: body.alt ?? file.name })
        .run();
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : "Could not add this photo.",
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
      <ToolbarButton
        label="Numbered list"
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        label="Blockquote"
        isActive={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        “ ”
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-[var(--border)]" />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="sr-only"
        aria-label="Choose a photo"
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
        aria-label="Add photo"
        title="Add photo"
      >
        {uploadingImage ? "Adding photo…" : "Photo"}
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
