"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BookmarkDialog } from "./BookmarkDialog";
import {
  readDocumentBookmarks,
  type DocumentBookmark,
} from "./extensions/Bookmarks";

type OutlineHeading = {
  level: number;
  position: number;
  text: string;
  id: string;
};

function readHeadings(editor: Editor) {
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

function readActiveHeadingPosition(editor: Editor) {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "heading") return $from.before(depth);
  }
  return null;
}

function sameBookmarks(
  current: DocumentBookmark[],
  next: DocumentBookmark[],
) {
  return (
    current.length === next.length &&
    current.every(
      (bookmark, index) =>
        bookmark.bookmarkId === next[index]?.bookmarkId &&
        bookmark.label === next[index]?.label &&
        bookmark.position === next[index]?.position,
    )
  );
}

export function DocumentOutline({
  editor,
  canEdit,
  onClose,
}: {
  editor: Editor;
  canEdit: boolean;
  onClose: () => void;
}) {
  const [headings, setHeadings] = useState(() => readHeadings(editor));
  const [bookmarks, setBookmarks] = useState(() =>
    readDocumentBookmarks(editor.state.doc),
  );
  const [activeHeadingPosition, setActiveHeadingPosition] = useState(() =>
    readActiveHeadingPosition(editor),
  );
  const [copiedTargetId, setCopiedTargetId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [editingBookmark, setEditingBookmark] =
    useState<DocumentBookmark | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
              heading.text === nextHeading.text &&
              heading.id === nextHeading.id
            );
          });
        return unchanged ? currentHeadings : nextHeadings;
      });
      const nextBookmarks = readDocumentBookmarks(editor.state.doc);
      setBookmarks((currentBookmarks) =>
        sameBookmarks(currentBookmarks, nextBookmarks)
          ? currentBookmarks
          : nextBookmarks,
      );
      setActiveHeadingPosition(readActiveHeadingPosition(editor));
    }

    editor.on("transaction", refreshOutline);
    return () => {
      editor.off("transaction", refreshOutline);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, [editor]);

  function navigateToHeading(position: number, id: string) {
    if (id) {
      window.history.replaceState(null, "", `#${encodeURIComponent(id)}`);
    }
    editor.commands.setTextSelection(position + 1);
    editor.commands.scrollIntoView();
    window.setTimeout(() => {
      if (!editor.isDestroyed) editor.view.focus();
    }, 0);
  }

  async function copyTargetLink(id: string) {
    if (!id) return;
    const url = new URL(window.location.href);
    url.hash = id;
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedTargetId(id);
      setCopyStatus("Link copied.");
    } catch {
      setCopiedTargetId(null);
      setCopyStatus("Could not copy the link.");
    }
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => {
      setCopiedTargetId(null);
      setCopyStatus("");
    }, 1600);
  }

  return (
    <>
      <aside
        id="document-outline"
        aria-label="Document outline"
        className="print-hidden w-full shrink-0 border-b border-[var(--border)] bg-[var(--surface)] p-3 lg:w-64 lg:border-r lg:border-b-0"
      >
        <p className="sr-only" aria-live="polite">
          {copyStatus}
        </p>
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
              <li
                key={`${heading.position}-${heading.id}-${heading.text}`}
                className="group flex items-center gap-0.5"
              >
                <button
                  type="button"
                  onClick={() => navigateToHeading(heading.position, heading.id)}
                  aria-current={
                    activeHeadingPosition === heading.position
                      ? "location"
                      : undefined
                  }
                  className={`block min-w-0 flex-1 truncate rounded-sm py-1 pr-2 text-left text-xs hover:bg-[var(--surface-subtle)] ${
                    activeHeadingPosition === heading.position
                      ? "bg-[var(--surface-subtle)] font-semibold text-[var(--accent-strong)]"
                      : ""
                  }`}
                  style={{ paddingLeft: `${8 + (heading.level - 1) * 10}px` }}
                  title={heading.text}
                >
                  {heading.text}
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      editor.commands.setTextSelection(heading.position + 1);
                      editor.commands.setCurrentHeadingInOutline(false);
                    }}
                    aria-label={`Remove ${heading.text} from document outline`}
                    title="Remove from outline"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-[var(--muted)] opacity-70 hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                  >
                    ×
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!heading.id}
                  onClick={() => void copyTargetLink(heading.id)}
                  aria-label={`Copy link to ${heading.text}`}
                  title={
                    copiedTargetId === heading.id
                      ? "Link copied"
                      : "Copy section link"
                  }
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-[var(--muted)] opacity-70 hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] disabled:opacity-30 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                >
                  {copiedTargetId === heading.id ? "✓" : "#"}
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
        <div className="mt-4 border-t border-[var(--border)] pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Bookmarks
        </h3>
        {bookmarks.length > 0 ? (
          <ol className="mt-2 space-y-1" aria-label="Document bookmarks">
            {bookmarks.map((bookmark) => (
              <li
                key={bookmark.bookmarkId}
                className="group flex items-center gap-0.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    window.history.replaceState(
                      null,
                      "",
                      `#${encodeURIComponent(bookmark.domId)}`,
                    );
                    editor.commands.setNodeSelection(bookmark.position);
                    editor.commands.scrollIntoView();
                    window.setTimeout(() => {
                      if (!editor.isDestroyed) editor.view.focus();
                    }, 0);
                  }}
                  className="min-w-0 flex-1 truncate rounded-sm px-2 py-1 text-left text-xs hover:bg-[var(--surface-subtle)]"
                  title={bookmark.label}
                >
                  <span aria-hidden="true">🔖 </span>
                  {bookmark.label}
                </button>
                <button
                  type="button"
                  onClick={() => void copyTargetLink(bookmark.domId)}
                  aria-label={`Copy link to bookmark ${bookmark.label}`}
                  title={
                    copiedTargetId === bookmark.domId
                      ? "Link copied"
                      : "Copy bookmark link"
                  }
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-[var(--muted)] opacity-70 hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                >
                  {copiedTargetId === bookmark.domId ? "✓" : "#"}
                </button>
                {canEdit ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingBookmark(bookmark)}
                      aria-label={`Rename bookmark ${bookmark.label}`}
                      title="Rename bookmark"
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-[var(--muted)] opacity-70 hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        editor.commands.deleteBookmark(bookmark.bookmarkId)
                      }
                      aria-label={`Delete bookmark ${bookmark.label}`}
                      title="Delete bookmark"
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-[var(--muted)] opacity-70 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                    >
                      ×
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Add bookmarks to save named destinations.
          </p>
        )}
        </div>
      </aside>
      {editingBookmark ? (
        <BookmarkDialog
          mode="rename"
          initialLabel={editingBookmark.label}
          onSubmit={(label) =>
            editor.commands.renameBookmark(editingBookmark.bookmarkId, label)
          }
          onClose={() => setEditingBookmark(null)}
        />
      ) : null}
    </>
  );
}
