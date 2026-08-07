"use client";

import { useEffect, useId, useState } from "react";
import type { Editor } from "@tiptap/react";

import { countText, getDocumentText } from "@/lib/editorText";

function CountRows({
  label,
  counts,
}: {
  label: string;
  counts: ReturnType<typeof countText>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{label}</h3>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
        <dt>Words</dt>
        <dd className="tabular-nums">{counts.words.toLocaleString()}</dd>
        <dt>Characters</dt>
        <dd className="tabular-nums">{counts.characters.toLocaleString()}</dd>
        <dt>Characters excluding spaces</dt>
        <dd className="tabular-nums">
          {counts.charactersWithoutSpaces.toLocaleString()}
        </dd>
      </dl>
    </div>
  );
}

export function WordCountDialog({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const titleId = useId();
  const [, setDocumentVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setDocumentVersion((version) => version + 1);
    editor.on("update", refresh);
    editor.on("selectionUpdate", refresh);
    return () => {
      editor.off("update", refresh);
      editor.off("selectionUpdate", refresh);
    };
  }, [editor]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const { doc, selection } = editor.state;
  const documentCounts = countText(getDocumentText(doc));
  const hasSelection = !selection.empty;
  const selectionCounts = hasSelection
    ? countText(getDocumentText(doc, selection.from, selection.to))
    : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/45 p-4 pt-[12vh]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-panel w-full max-w-sm rounded-xl p-5 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold">
            Word count
          </h2>
          <button
            type="button"
            autoFocus
            aria-label="Close word count"
            title="Close"
            onClick={onClose}
            className="app-button-secondary inline-flex size-8 items-center justify-center p-0 text-lg"
          >
            ×
          </button>
        </div>
        <div className="mt-4 space-y-5">
          <CountRows label="Document" counts={documentCounts} />
          {selectionCounts ? (
            <div className="border-t border-[var(--border)] pt-4">
              <CountRows label="Selection" counts={selectionCounts} />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
