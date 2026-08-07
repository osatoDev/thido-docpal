"use client";

import { useEffect, useId, useState } from "react";
import type { Editor } from "@tiptap/react";

import { findDocumentTextMatches } from "@/lib/editorText";

export function FindReplaceDialog({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [, setDocumentVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setDocumentVersion((version) => version + 1);
    editor.on("update", refresh);
    return () => {
      editor.off("update", refresh);
    };
  }, [editor]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const matches = findDocumentTextMatches(editor.state.doc, query, matchCase);
  const normalizedIndex = matches.length
    ? Math.min(Math.max(currentIndex, 0), matches.length - 1)
    : -1;

  function selectMatch(index: number) {
    const match = matches[index];
    if (!match) return;
    setCurrentIndex(index);
    editor
      .chain()
      .focus()
      .setTextSelection({ from: match.from, to: match.to })
      .scrollIntoView()
      .run();
  }

  function findNext(direction: 1 | -1) {
    if (matches.length === 0) return;
    const nextIndex =
      currentIndex < 0
        ? direction === 1
          ? 0
          : matches.length - 1
        : (normalizedIndex + direction + matches.length) % matches.length;
    selectMatch(nextIndex);
  }

  function replaceCurrent() {
    const match = matches[normalizedIndex];
    if (!match) return;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: match.from, to: match.to }, replacement)
      .run();

    const nextMatches = findDocumentTextMatches(
      editor.state.doc,
      query,
      matchCase,
    );
    const nextIndex = Math.min(normalizedIndex, nextMatches.length - 1);
    setCurrentIndex(nextIndex);
    const nextMatch = nextMatches[nextIndex];
    if (nextMatch) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: nextMatch.from, to: nextMatch.to })
        .scrollIntoView()
        .run();
    }
  }

  function replaceAll() {
    if (matches.length === 0) return;
    const chain = editor.chain().focus();
    for (const match of [...matches].reverse()) {
      chain.insertContentAt({ from: match.from, to: match.to }, replacement);
    }
    chain.run();
    setCurrentIndex(-1);
  }

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
        className="app-panel w-full max-w-lg rounded-xl p-5 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold">
            Find and replace
          </h2>
          <button
            type="button"
            aria-label="Close find and replace"
            title="Close"
            onClick={onClose}
            className="app-button-secondary inline-flex size-8 items-center justify-center p-0 text-lg"
          >
            ×
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Find</span>
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentIndex(-1);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                findNext(event.shiftKey ? -1 : 1);
              }}
              autoFocus
              className="app-input rounded-md px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Replace with</span>
            <input
              type="text"
              value={replacement}
              onChange={(event) => setReplacement(event.target.value)}
              className="app-input rounded-md px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(event) => {
                setMatchCase(event.target.checked);
                setCurrentIndex(-1);
              }}
            />
            Match case
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-[var(--muted)]">
            {query
              ? matches.length
                ? currentIndex >= 0
                  ? `${normalizedIndex + 1} of ${matches.length}`
                  : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`
                : "No matches"
              : "Enter text to search"}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={matches.length === 0}
              onClick={() => findNext(-1)}
              className="app-button-secondary px-3 py-1.5 text-sm disabled:opacity-45"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={matches.length === 0}
              onClick={() => findNext(1)}
              className="app-button-secondary px-3 py-1.5 text-sm disabled:opacity-45"
            >
              Next
            </button>
            <button
              type="button"
              disabled={matches.length === 0}
              onClick={replaceCurrent}
              className="app-button-secondary px-3 py-1.5 text-sm disabled:opacity-45"
            >
              Replace
            </button>
            <button
              type="button"
              disabled={matches.length === 0}
              onClick={replaceAll}
              className="app-button-primary px-3 py-1.5 text-sm disabled:opacity-45"
            >
              Replace all
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
