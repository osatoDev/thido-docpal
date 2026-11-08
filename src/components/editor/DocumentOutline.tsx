"use client";

import type { Editor } from "@tiptap/react";
import { DayOutline } from "./DayOutline";
import { ProjectOutline } from "./ProjectOutline";

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

function ChevronIcon({ pointing }: { pointing: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`size-4 fill-none stroke-current ${pointing === "right" ? "rotate-180" : ""}`}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.5 5 7.5 10l5 5" />
    </svg>
  );
}

/**
 * Always on screen: expanded shows the days and projects, collapsed is a slim rail. On wide
 * screens it sticks below the editor header and scrolls on its own.
 */
export function DocumentOutline({
  editor,
  canEdit,
  expanded,
  onToggle,
}: {
  editor: Editor;
  canEdit: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const toggleLabel = expanded ? "Collapse outline" : "Expand outline";
  const toggle = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls="document-outline-days"
      aria-label={toggleLabel}
      title={toggleLabel}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
    >
      <ChevronIcon pointing={expanded ? "left" : "right"} />
    </button>
  );

  if (!expanded) {
    return (
      <aside
        id="document-outline"
        aria-label="Document outline"
        className="print-hidden flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 lg:w-12 lg:flex-col lg:justify-start lg:border-b-0 lg:px-2 lg:py-3 lg:sticky lg:top-[var(--editor-chrome-height,0px)] lg:max-h-[calc(100vh-var(--editor-chrome-height,0px))] lg:self-start lg:overflow-y-auto"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] lg:sr-only">
          Outline
        </span>
        {toggle}
      </aside>
    );
  }

  return (
    <aside
      id="document-outline"
      aria-label="Document outline"
      className="print-hidden w-full shrink-0 border-b border-[var(--border)] bg-[var(--surface)] p-3 lg:w-64 lg:border-b-0 lg:sticky lg:top-[var(--editor-chrome-height,0px)] lg:max-h-[calc(100vh-var(--editor-chrome-height,0px))] lg:self-start lg:overflow-y-auto"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Outline
        </h2>
        {toggle}
      </div>
      <div id="document-outline-days">
        <DayOutline editor={editor} />
        <ProjectOutline editor={editor} canEdit={canEdit} />
      </div>
    </aside>
  );
}
