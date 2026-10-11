"use client";

import type { Editor } from "@tiptap/react";
import { DayOutline } from "./DayOutline";

export type OutlineHeading = {
  level: number;
  position: number;
  text: string;
  id: string;
};

export function readHeadings(editor: Editor) {
  const headings: OutlineHeading[] = [];
  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== "heading" || node.attrs.outlineHidden === true) return;
    headings.push({
      level: Number(node.attrs.level) || 1,
      position,
      text: node.textContent.trim() || "Untitled heading",
      id: String(node.attrs.headingId ?? ""),
    });
  });
  return headings;
}

export function DocumentOutline({
  editor,
  onClose,
}: {
  editor: Editor;
  canEdit: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      id="document-outline"
      aria-label="Document outline"
      className="print-hidden w-full shrink-0 border-b border-[var(--border)] bg-[var(--surface)] p-3 lg:w-64 lg:border-r lg:border-b-0"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Outline
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide document outline"
          title="Hide document outline"
          className="inline-flex size-7 items-center justify-center rounded-sm text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
        >
          ×
        </button>
      </div>
      <DayOutline editor={editor} />
    </aside>
  );
}
