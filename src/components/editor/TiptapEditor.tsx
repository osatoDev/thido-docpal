"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { Toolbar } from "./Toolbar";
import { CommentSidebar } from "@/components/comments/CommentSidebar";
import { CommentComposer } from "@/components/comments/CommentComposer";
import { AiModeToggle } from "@/components/settings/AiModeToggle";
import { Brand } from "@/components/Brand";
import type { CommentWithReplies } from "@/lib/types";

type Props = {
  documentId: string;
  initialTitle: string;
  initialContent: JSONContent | null;
  initialComments: CommentWithReplies[];
};

type SaveState = "idle" | "saving" | "saved" | "error";
type ActiveComposer = {
  anchorMarkId: string;
  quotedText: string;
  from: number;
  to: number;
};

export function TiptapEditor({
  documentId,
  initialTitle,
  initialContent,
  initialComments,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [comments, setComments] = useState<CommentWithReplies[]>(initialComments);
  const [activeComposer, setActiveComposer] = useState<ActiveComposer | null>(null);
  const [pendingCommentIds, setPendingCommentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [commentError, setCommentError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: initialContent ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[60vh] focus:outline-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-blockquote:text-[var(--muted)]",
      },
    },
    onUpdate: ({ editor }) => {
      scheduleSave({ content: editor.getJSON() });
    },
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function scheduleSave(next: { title?: string; content?: JSONContent }) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 600);
  }

  function startComment() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const quotedText = editor.state.doc.textBetween(from, to, " ");
    const anchorMarkId = crypto.randomUUID();

    editor.chain().setComment(anchorMarkId).run();
    setActiveComposer({ anchorMarkId, quotedText, from, to });
  }

  function cancelComment() {
    if (editor && activeComposer) {
      editor
        .chain()
        .setTextSelection({ from: activeComposer.from, to: activeComposer.to })
        .unsetComment()
        .run();
    }
    setActiveComposer(null);
  }

  function submitComment(body: string) {
    if (!activeComposer) return;
    const composer = activeComposer;
    setCommentError(null);
    setActiveComposer(null);

    void persistComment(composer, body);
  }

  async function persistComment(composer: ActiveComposer, body: string) {
    try {
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchorMarkId: composer.anchorMarkId,
          quotedText: composer.quotedText,
          body,
        }),
      });
      if (!res.ok) throw new Error("Could not create comment");
      const data = await res.json();
      const savedComment: CommentWithReplies = {
        ...data.comment,
        replies: [],
        suggestion: null,
      };

      if (!mountedRef.current) return;
      setComments((prev) => [savedComment, ...prev]);
      setPendingCommentIds((prev) => new Set(prev).add(savedComment.id));

      void pollForAiResponse(savedComment.id);
    } catch {
      if (!mountedRef.current) return;
      setCommentError("The comment could not be saved. You can keep editing and try again.");
    }
  }

  async function pollForAiResponse(commentId: string) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1250));
      if (!mountedRef.current) return;

      try {
        const res = await fetch(`/api/documents/${documentId}/comments`, {
          cache: "no-store",
        });
        if (!res.ok) continue;
        const data = await res.json();
        const refreshed = data.comments as CommentWithReplies[];
        const target = refreshed.find((comment) => comment.id === commentId);

        setComments(refreshed);

        const finished =
          !!target && (target.replies.length > 0 || !!target.suggestion);
        if (finished) {
          setPendingCommentIds((prev) => {
            const next = new Set(prev);
            next.delete(commentId);
            return next;
          });

          if (
            target.suggestion?.status === "AUTO_APPLIED" &&
            data.documentContent &&
            editor
          ) {
            editor.commands.setContent(data.documentContent);
          }
          return;
        }
      } catch {
        // A transient refresh failure should not interrupt editing or other
        // comment submissions. The next polling attempt can recover.
      }
    }

    // Keep the accurate processing state if the response is unusually slow.
    // A later page load will include the completed server-side response.
  }

  function handleCommentChange(updated: CommentWithReplies) {
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleCommentDelete(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  function handleDocumentContentUpdated(content: unknown) {
    if (content && editor) {
      editor.commands.setContent(content as JSONContent);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex w-full min-w-0 flex-1 flex-col gap-5 p-3 sm:p-5 lg:p-7">
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              All documents
            </Link>
            <Link
              href="/settings"
              className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Settings
            </Link>
            <AiModeToggle />
          </div>
        </header>
        <div className="flex items-center justify-between gap-4">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
            aria-label="Document title"
            className="w-full border-none bg-transparent text-2xl font-semibold tracking-[-0.04em] outline-none"
          />
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-[0.65rem] text-[var(--muted-soft)]">
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved"}
              {saveState === "error" && "Save failed"}
            </span>
          </div>
        </div>

        {commentError && (
          <p className="text-xs text-[var(--danger)]" role="alert">
            {commentError}
          </p>
        )}

        <div className="app-panel flex flex-1 flex-col overflow-hidden rounded-2xl">
          <Toolbar editor={editor} />
          {editor && (
            <BubbleMenu editor={editor}>
              <div className="app-panel flex items-center gap-1 rounded-lg p-1">
                <button
                  type="button"
                  onClick={startComment}
                  className="rounded-md px-2 py-1 text-xs font-semibold hover:bg-[var(--surface-subtle)]"
                >
                  💬 Comment
                </button>
              </div>
            </BubbleMenu>
          )}
          <div className="flex-1 overflow-y-auto p-5 sm:p-8">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="flex min-h-72 w-full shrink-0 flex-col border-t border-[var(--border)] lg:min-h-0 lg:w-80 lg:border-t-0">
        {activeComposer && (
          <div className="border-b border-[var(--border)] bg-[var(--surface)] p-4">
            <CommentComposer
              quotedText={activeComposer.quotedText}
              onSubmit={submitComment}
              onCancel={cancelComment}
            />
          </div>
        )}
        <CommentSidebar
          comments={comments}
          onChange={handleCommentChange}
          onDelete={handleCommentDelete}
          onDocumentContentUpdated={handleDocumentContentUpdated}
          pendingCommentIds={pendingCommentIds}
        />
      </div>
    </div>
  );
}
