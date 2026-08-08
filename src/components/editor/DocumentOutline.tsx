"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

type OutlineHeading = {
  level: number;
  position: number;
  text: string;
};

function readHeadings(editor: Editor) {
  const headings: OutlineHeading[] = [];
  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== "heading") return;
    headings.push({
      level: Number(node.attrs.level) || 1,
      position,
      text: node.textContent.trim() || "Untitled heading",
    });
  });
  return headings;
}

export function DocumentOutline({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [headings, setHeadings] = useState(() => readHeadings(editor));

  useEffect(() => {
    function refreshOutline() {
      const nextHeadings = readHeadings(editor);
      setHeadings((currentHeadings) => {
        const unchanged =
          currentHeadings.length === nextHeadings.length &&
          currentHeadings.every((heading, index) => {
            const nextHeading = nextHeadings[index];
            return (
              heading.level === nextHeading.level &&
              heading.position === nextHeading.position &&
              heading.text === nextHeading.text
            );
          });
        return unchanged ? currentHeadings : nextHeadings;
      });
    }

    editor.on("transaction", refreshOutline);
    return () => {
      editor.off("transaction", refreshOutline);
    };
  }, [editor]);

  function navigateToHeading(position: number) {
    editor.commands.setTextSelection(position + 1);
    editor.commands.scrollIntoView();
    window.setTimeout(() => {
      if (!editor.isDestroyed) editor.view.focus();
    }, 0);
  }

  return (
    <aside
      id="document-outline"
      aria-label="Document outline"
      className="print-hidden w-full shrink-0 border-b border-[var(--border)] bg-[var(--surface)] p-3 lg:w-56 lg:border-r lg:border-b-0"
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
      {headings.length > 0 ? (
        <nav aria-label="Document headings" className="mt-2 max-h-48 overflow-y-auto lg:max-h-none">
          <ol className="space-y-0.5">
            {headings.map((heading) => (
              <li key={`${heading.position}-${heading.text}`}>
                <button
                  type="button"
                  onClick={() => navigateToHeading(heading.position)}
                  className="block w-full truncate rounded-sm py-1 pr-2 text-left text-xs hover:bg-[var(--surface-subtle)]"
                  style={{ paddingLeft: `${8 + (heading.level - 1) * 10}px` }}
                  title={heading.text}
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : (
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          Add headings to navigate this document.
        </p>
      )}
    </aside>
  );
}
