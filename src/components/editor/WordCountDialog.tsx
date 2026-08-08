"use client";

import { useEffect, useId, useState } from "react";
import type { Editor } from "@tiptap/react";

import {
  countText,
  getDocumentInsights,
  getDocumentText,
} from "@/lib/editorText";

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
  const insights = getDocumentInsights(doc);
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
        className="app-panel max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-xl p-5 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold">
            Document statistics
          </h2>
          <button
            type="button"
            autoFocus
            aria-label="Close document statistics"
            title="Close"
            onClick={onClose}
            className="app-button-secondary inline-flex size-8 items-center justify-center p-0 text-lg"
          >
            ×
          </button>
        </div>
        <div className="mt-4 space-y-5">
          <CountRows label="Document" counts={documentCounts} />
          <div className="border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-semibold">Structure and reading</h3>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
              <dt>Sentences</dt>
              <dd className="tabular-nums">{insights.sentences.toLocaleString()}</dd>
              <dt>Paragraphs</dt>
              <dd className="tabular-nums">{insights.paragraphs.toLocaleString()}</dd>
              <dt>Headings</dt>
              <dd className="tabular-nums">{insights.headings.toLocaleString()}</dd>
              <dt>Tables</dt>
              <dd className="tabular-nums">{insights.tables.toLocaleString()}</dd>
              <dt>Images</dt>
              <dd className="tabular-nums">{insights.images.toLocaleString()}</dd>
              <dt>Estimated reading time</dt>
              <dd className="tabular-nums">
                {insights.estimatedReadingMinutes} min
              </dd>
              <dt>Estimated pages</dt>
              <dd className="tabular-nums">{insights.estimatedPages}</dd>
            </dl>
          </div>
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
