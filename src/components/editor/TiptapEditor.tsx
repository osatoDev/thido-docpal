"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { Toolbar } from "./Toolbar";
import { CommentSidebar } from "@/components/comments/CommentSidebar";
import { CommentComposer } from "@/components/comments/CommentComposer";
import { AiModeToggle } from "@/components/settings/AiModeToggle";
import {
  ShareDocumentControl,
  type CollaboratorPermission,
  type CollaboratorSummary,
} from "@/components/documents/ShareDocumentControl";
import { Brand } from "@/components/Brand";
import type { CommentAiProgress, CommentWithReplies } from "@/lib/types";
import { isDocumentWideCommentRequest } from "@/lib/commentProcessing";

type Props = {
  documentId: string;
  initialTitle: string;
  initialContent: JSONContent | null;
  initialComments: CommentWithReplies[];
  initialCommentProgress: Record<string, CommentAiProgress>;
  initialShareToken: string | null;
  initialCollaborators: CollaboratorSummary[];
  accessPermission: CollaboratorPermission;
  startedFromPaste?: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";
type SelectionComposer = {
  scope: "SELECTION";
  anchorMarkId: string;
  quotedText: string;
  from: number;
  to: number;
};
type DocumentComposer = {
  scope: "DOCUMENT";
};
type ActiveComposer = SelectionComposer | DocumentComposer;

const BROADER_SCOPE_PROMPT = /\b(paragraph|section|intro|introduction|conclusion|opening|closing|entire|whole|overall)\b/i;

export function TiptapEditor({
  documentId,
  initialTitle,
  initialContent,
  initialComments,
  initialCommentProgress,
  initialShareToken,
  initialCollaborators,
  accessPermission,
  startedFromPaste = false,
}: Props) {
  const canComment = accessPermission !== "VIEW";
  const canEdit =
    accessPermission === "EDIT" || accessPermission === "FULL";
  const canManage = accessPermission === "FULL";
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [comments, setComments] = useState<CommentWithReplies[]>(initialComments);
  const [activeComposer, setActiveComposer] = useState<ActiveComposer | null>(null);
  const [pendingCommentIds, setPendingCommentIds] = useState<Set<string>>(() => {
    return new Set(
      Object.entries(initialCommentProgress).flatMap(([commentId, progress]) =>
        progress.status === "PENDING" ? [commentId] : [],
      ),
    );
  });
  const [foregroundCommentCount, setForegroundCommentCount] = useState(0);
  const [commentProgress, setCommentProgress] = useState<
    Record<string, CommentAiProgress>
  >(initialCommentProgress);
  const [commentError, setCommentError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: initialContent ?? "",
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[60vh] focus:outline-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-blockquote:text-[var(--muted)]",
      },
    },
    onUpdate: ({ editor }) => {
      if (canEdit || canComment) {
        scheduleSave({ content: editor.getJSON() });
      }
    },
  });
  const editorRef = useRef(editor);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  function scheduleSave(next: { title?: string; content?: JSONContent }) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null;
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

    if (activeComposer?.scope === "SELECTION") {
      editor
        .chain()
        .setTextSelection({
          from: activeComposer.from,
          to: activeComposer.to,
        })
        .unsetComment()
        .run();
    }
    const quotedText = editor.state.doc.textBetween(from, to, " ");
    const anchorMarkId = crypto.randomUUID();

    editor
      .chain()
      .setTextSelection({ from, to })
      .setComment(anchorMarkId)
      .run();
    setActiveComposer({
      scope: "SELECTION",
      anchorMarkId,
      quotedText,
      from,
      to,
    });
  }

  function startDocumentComment() {
    if (editor && activeComposer?.scope === "SELECTION") {
      editor
        .chain()
        .setTextSelection({
          from: activeComposer.from,
          to: activeComposer.to,
        })
        .unsetComment()
        .run();
    }
    setCommentError(null);
    setActiveComposer({ scope: "DOCUMENT" });
  }

  function cancelComment() {
    if (editor && activeComposer?.scope === "SELECTION") {
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
    let composer: ActiveComposer = activeComposer;
    if (
      activeComposer.scope === "SELECTION" &&
      isDocumentWideCommentRequest(body)
    ) {
      if (editor) {
        editor
          .chain()
          .setTextSelection({
            from: activeComposer.from,
            to: activeComposer.to,
          })
          .unsetComment()
          .run();
      }
      composer = { scope: "DOCUMENT" };
    } else if (activeComposer.scope === "SELECTION") {
      composer = expandCommentScope(activeComposer, body);
    }
    setCommentError(null);
    setActiveComposer(null);

    void persistComment(composer, body);
  }

  function expandCommentScope(composer: SelectionComposer, body: string) {
    if (!editor || !BROADER_SCOPE_PROMPT.test(body)) {
      return composer;
    }

    const { doc } = editor.state;
    const from = Math.min(composer.from, composer.to);
    const to = Math.max(composer.from, composer.to);
    const $from = doc.resolve(from);
    const $to = doc.resolve(to);

    // Keep wider rewrites constrained to the containing text block for now.
    if (!$from.sameParent($to) || !$from.parent.isTextblock) {
      return composer;
    }

    const expandedFrom = $from.start();
    const expandedTo = $from.end();
    if (
      expandedFrom === composer.from &&
      expandedTo === composer.to
    ) {
      return composer;
    }

    const quotedText = doc.textBetween(expandedFrom, expandedTo, " ");

    editor
      .chain()
      .setTextSelection({ from: composer.from, to: composer.to })
      .unsetComment()
      .setTextSelection({ from: expandedFrom, to: expandedTo })
      .setComment(composer.anchorMarkId)
      .run();

    return {
      ...composer,
      from: expandedFrom,
      to: expandedTo,
      quotedText,
    };
  }

  async function persistComment(composer: ActiveComposer, body: string) {
    const waitForAi =
      composer.scope === "DOCUMENT" || isDocumentWideCommentRequest(body);
    if (waitForAi) {
      setForegroundCommentCount((count) => count + 1);
    }

    try {
      if (!editor) throw new Error("Editor is not ready");
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      // Suggestion approval resolves changes by this mark, so the mark must
      // be durable before the comment starts background AI generation.
      setSaveState("saving");
      const saveResponse = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editor.getJSON() }),
      });
      setSaveState(saveResponse.ok ? "saved" : "error");
      if (!saveResponse.ok) {
        throw new Error(
          composer.scope === "DOCUMENT"
            ? "Could not save the document before commenting"
            : "Could not save the comment highlight",
        );
      }

      const selectionTarget =
        composer.scope === "SELECTION"
          ? {
              anchorMarkId: composer.anchorMarkId,
              quotedText: composer.quotedText,
            }
          : {};
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: composer.scope,
          ...selectionTarget,
          body,
        }),
      });
      if (!res.ok) throw new Error("Could not create comment");
      const data = await res.json();
      const savedComment: CommentWithReplies = {
        ...data.comment,
        replies: data.comment.replies ?? [],
        suggestion: data.comment.suggestion ?? null,
      };

      if (!mountedRef.current) return;
      setComments((prev) => [savedComment, ...prev]);

      if (data.aiProcessing === "background") {
        setPendingCommentIds((prev) => new Set(prev).add(savedComment.id));
        setCommentProgress((previous) => ({
          ...previous,
          [savedComment.id]: { status: "QUEUED", startedAt: null },
        }));
        void pollForAiResponse(savedComment.id);
      } else if (data.aiProcessing === "failed") {
        setCommentError(
          "The comment was saved, but Thido could not finish responding. You can keep editing and try again.",
        );
      }

      if (data.documentContent && editor) {
        editor.commands.setContent(data.documentContent);
      }
    } catch {
      if (!mountedRef.current) return;
      setSaveState("error");
      setCommentError("The comment could not be saved. You can keep editing and try again.");
    } finally {
      if (waitForAi && mountedRef.current) {
        setForegroundCommentCount((count) => Math.max(0, count - 1));
      }
    }
  }

  const pollForAiResponse = useCallback(async (commentId: string) => {
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
        const progress = data.aiProgress?.[commentId] as
          | CommentAiProgress
          | undefined;

        setComments(refreshed);
        if (progress) {
          setCommentProgress((previous) => ({
            ...previous,
            [commentId]: progress,
          }));
        }

        if (progress?.status === "FAILED") {
          setPendingCommentIds((prev) => {
            const next = new Set(prev);
            next.delete(commentId);
            return next;
          });
          return;
        }

        const finished =
          !!target && (target.replies.length > 0 || !!target.suggestion);
        if (finished) {
          setPendingCommentIds((prev) => {
            const next = new Set(prev);
            next.delete(commentId);
            return next;
          });
          setCommentProgress((previous) => {
            const next = { ...previous };
            delete next[commentId];
            return next;
          });

          if (
            target.suggestion?.status === "AUTO_APPLIED" &&
            data.documentContent &&
            editorRef.current
          ) {
            editorRef.current.commands.setContent(data.documentContent);
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
  }, [documentId]);

  useEffect(() => {
    for (const [commentId, progress] of Object.entries(
      initialCommentProgress,
    )) {
      if (progress.status === "PENDING") {
        void pollForAiResponse(commentId);
      }
    }
  }, [initialCommentProgress, pollForAiResponse]);

  function handleCommentChange(updated: CommentWithReplies) {
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleCommentDelete(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    setPendingCommentIds((previous) => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
    setCommentProgress((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }

  function handleDocumentContentUpdated(content: unknown) {
    if (content && editor) {
      editor.commands.setContent(content as JSONContent);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex w-full min-w-0 flex-1 flex-col gap-6 px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <input
            value={title}
            readOnly={!canEdit}
            onChange={(e) => {
              if (!canEdit) return;
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
            aria-label="Document title"
            className={`editor-title w-full border-none bg-transparent font-serif text-3xl font-normal tracking-[-0.035em] outline-none sm:text-4xl ${
              canEdit ? "" : "cursor-default"
            }`}
          />
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-[var(--muted-soft)]">
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved"}
              {saveState === "error" && "Save failed"}
            </span>
            {!canEdit && (
              <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">
                {canComment ? "Comment access" : "View only"}
              </span>
            )}
            {canManage && (
              <ShareDocumentControl
                documentId={documentId}
                initialShareToken={initialShareToken}
                initialCollaborators={initialCollaborators}
              />
            )}
          </div>
        </div>

        {commentError && (
          <p className="text-xs text-[var(--danger)]" role="alert">
            {commentError}
          </p>
        )}

        {startedFromPaste && !initialContent && (
          <div className="mx-auto w-full max-w-6xl border-l-2 border-[var(--warm)] pl-4">
            <p className="text-sm font-medium">Paste your document below.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              When it is saved, highlight any passage and choose Comment to
              ask Thido a question or request a change.
            </p>
          </div>
        )}

        <div className="app-panel mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-sm">
          {canEdit && <Toolbar editor={editor} />}
          {editor && canComment && (
            <BubbleMenu editor={editor}>
              <div className="app-panel flex items-center gap-1 rounded-sm p-1">
                <button
                  type="button"
                  onClick={startComment}
                  className="rounded-sm px-2 py-1 text-xs font-medium hover:bg-[var(--surface-subtle)]"
                >
                  Comment
                </button>
              </div>
            </BubbleMenu>
          )}
          <div className="flex-1 overflow-y-auto px-4 py-7 sm:px-7 sm:py-10 lg:px-8">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="flex min-h-72 w-full shrink-0 flex-col border-t border-[var(--border)] lg:min-h-0 lg:w-80 lg:border-t-0">
        {activeComposer && (
          <div className="border-b border-[var(--border)] bg-[var(--surface)] p-4">
            <CommentComposer
              key={activeComposer.scope}
              scope={activeComposer.scope}
              quotedText={
                activeComposer.scope === "SELECTION"
                  ? activeComposer.quotedText
                  : undefined
              }
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
          commentProgress={commentProgress}
          foregroundCommentCount={foregroundCommentCount}
          onStartDocumentComment={startDocumentComment}
          documentComposerOpen={activeComposer?.scope === "DOCUMENT"}
          canCreateComments={canComment && !!editor}
          canManageComments={canEdit}
        />
      </div>
    </div>
  );
}
