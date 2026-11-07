"use client";

import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";

import { getEditorExtensions } from "@/lib/editorExtensions";
import { useEditorHashNavigation } from "@/components/editor/useEditorHashNavigation";

export function ReadOnlyDocumentViewer({
  content,
  ariaLabel = "Document content",
}: {
  content: JSONContent;
  ariaLabel?: string;
}) {
  const editor = useEditor({
    extensions: getEditorExtensions(),
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        role: "document",
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-blockquote:text-[var(--muted)]",
      },
    },
  });
  useEditorHashNavigation(editor);

  return <EditorContent editor={editor} />;
}
