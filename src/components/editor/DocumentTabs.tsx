"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { readHeadings, type OutlineHeading } from "./DocumentOutline";

/**
 * A lightweight, Google Docs-tabs-inspired navigator. Unlike real Docs tabs
 * (independently editable sub-documents), this reads the existing single
 * content tree's top-level (H1) headings and presents them as a horizontal
 * tab strip for quick section jumps. No separate content per tab, so
 * comments, revisions, sharing, AI editing, and export are all unaffected.
 */

function sameHeadings(current: OutlineHeading[], next: OutlineHeading[]) {
  return (
    current.length === next.length &&
    current.every(
      (heading, index) =>
        heading.position === next[index]?.position &&
        heading.text === next[index]?.text &&
        heading.id === next[index]?.id,
    )
  );
}

export function readActiveTabPosition(
  editor: Editor,
  tabs: OutlineHeading[],
): number | null {
  if (tabs.length === 0) return null;
  const selectionPos = editor.state.selection.from;
  let active = tabs[0].position;
  for (const tab of tabs) {
    if (tab.position <= selectionPos) active = tab.position;
    else break;
  }
  return active;
}

export function DocumentTabs({ editor }: { editor: Editor | null }) {
  const [tabs, setTabs] = useState<OutlineHeading[]>(() =>
    editor ? readHeadings(editor).filter((heading) => heading.level === 1) : [],
  );
  const [activePosition, setActivePosition] = useState<number | null>(() =>
    editor ? readActiveTabPosition(editor, tabs) : null,
  );

  useEffect(() => {
    if (!editor) return;

    function refresh() {
      const nextTabs = readHeadings(editor!).filter(
        (heading) => heading.level === 1,
      );
      setTabs((current) =>
        sameHeadings(current, nextTabs) ? current : nextTabs,
      );
      setActivePosition(readActiveTabPosition(editor!, nextTabs));
    }

    refresh();
    editor.on("transaction", refresh);
    return () => {
      editor.off("transaction", refresh);
    };
  }, [editor]);

  if (!editor || tabs.length === 0) return null;

  return (
    <nav
      aria-label="Document sections"
      className="flex gap-1 overflow-x-auto"
    >
      {tabs.map((tab) => (
        <button
          key={`${tab.position}-${tab.id}`}
          type="button"
          onClick={() => {
            if (tab.id) {
              window.history.replaceState(null, "", `#${encodeURIComponent(tab.id)}`);
            }
            editor.commands.setTextSelection(tab.position + 1);
            editor.commands.scrollIntoView();
            window.setTimeout(() => {
              if (!editor.isDestroyed) editor.view.focus();
            }, 0);
          }}
          aria-current={activePosition === tab.position ? "true" : undefined}
          title={tab.text}
          className={`max-w-[12rem] shrink-0 truncate rounded-t-md border border-b-0 px-3 py-1.5 text-xs font-medium transition-colors ${
            activePosition === tab.position
              ? "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {tab.text}
        </button>
      ))}
    </nav>
  );
}
