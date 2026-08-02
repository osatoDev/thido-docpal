"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { Toolbar } from "./Toolbar";
import { CommentSidebar } from "@/components/comments/CommentSidebar";
import { CommentComposer } from "@/components/comments/CommentComposer";
import { RecentThidoChangeNotice } from "@/components/comments/RecentThidoChangeNotice";
import {
  UserMenu,
  type UserMenuProfile,
} from "@/components/account/UserMenu";
import {
  ShareDocumentControl,
  type CollaboratorPermission,
  type CollaboratorSummary,
} from "@/components/documents/ShareDocumentControl";
import { PrintDocumentButton } from "@/components/documents/PrintDocumentButton";
import {
  VersionHistoryControl,
  type RestoredDocument,
} from "@/components/documents/VersionHistoryControl";
import { DocumentFileActions } from "@/components/documents/DocumentFileActions";
import { Brand } from "@/components/Brand";
import type {
  CommentAiProgress,
  CommentWithReplies,
  SuggestionWithStatus,
} from "@/lib/types";
import { isDocumentWideCommentRequest } from "@/lib/commentProcessing";

type Props = {
  documentId: string;
  initialTitle: string;
  initialContent: JSONContent | null;
  initialRevision: number;
  initialComments: CommentWithReplies[];
  initialCommentProgress: Record<string, CommentAiProgress>;
  initialDocumentAiLocked: boolean;
  initialShareToken: string | null;
  initialCollaborators: CollaboratorSummary[];
  accessPermission: CollaboratorPermission;
  currentUser: UserMenuProfile;
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
  initialRevision,
  initialComments,
  initialCommentProgress,
  initialDocumentAiLocked,
  initialShareToken,
  initialCollaborators,
  accessPermission,
  currentUser,
  startedFromPaste = false,
}: Props) {
  const canComment = accessPermission !== "VIEW";
  const canEdit =
    accessPermission === "EDIT" || accessPermission === "FULL";
  const canManage = accessPermission === "FULL";
  const [title, setTitle] = useState(initialTitle);
  const [revision, setRevision] = useState(initialRevision);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [documentConflict, setDocumentConflict] = useState<string | null>(null);
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
  const [documentAiLocked, setDocumentAiLocked] = useState(
    initialDocumentAiLocked,
  );
  const [commentError, setCommentError] = useState<string | null>(null);
  const [recentThidoChange, setRecentThidoChange] =
    useState<SuggestionWithStatus | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{
    title?: string;
    content?: JSONContent;
  } | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const revisionRef = useRef(initialRevision);
  const conflictRef = useRef(false);
  const mountedRef = useRef(true);
  const documentAiLockedRef = useRef(initialDocumentAiLocked);
  const canEditNow = canEdit && !documentAiLocked;
  const canCommentNow = canComment && !documentAiLocked;
  const updateDocumentAiLock = useCallback((locked: boolean) => {
    documentAiLockedRef.current = locked;
    setDocumentAiLocked(locked);
    if (locked) {
      setActiveComposer(null);
    }
  }, []);

  const updateRevision = useCallback((nextRevision: number) => {
    revisionRef.current = nextRevision;
    setRevision(nextRevision);
  }, []);

  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: initialContent ?? "",
    editable: canEditNow,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[60vh] focus:outline-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-blockquote:text-[var(--muted)]",
      },
    },
    onUpdate: ({ editor }) => {
      if (!documentAiLockedRef.current && (canEdit || canComment)) {
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

  useEffect(() => {
    editor?.setEditable(canEditNow);
  }, [canEditNow, editor]);

  function scheduleSave(next: { title?: string; content?: JSONContent }) {
    if (documentAiLockedRef.current || conflictRef.current) return;
    pendingSaveRef.current = { ...pendingSaveRef.current, ...next };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (pending) void saveDocumentUpdate(pending);
    }, 600);
  }

  function saveDocumentUpdate(next: {
    title?: string;
    content?: JSONContent;
  }) {
    const operation = saveChainRef.current.then(async () => {
      if (conflictRef.current) {
        return { ok: false, body: { documentConflict: true } };
      }
      try {
        const response = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...next,
            baseRevision: revisionRef.current,
          }),
        });
        const body = (await response.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;

        if (response.ok) {
          const savedDocument = body?.document as
            | { revision?: unknown }
            | undefined;
          if (typeof savedDocument?.revision === "number") {
            updateRevision(savedDocument.revision);
          }
          setSaveState("saved");
          return { ok: true, body };
        }

        setSaveState("error");
        if (body?.documentConflict === true) {
          conflictRef.current = true;
          setDocumentConflict(
            typeof body.error === "string"
              ? body.error
              : "This document changed somewhere else.",
          );
        } else if (body?.documentAiLocked === true) {
          updateDocumentAiLock(true);
          setCommentError(
            typeof body.error === "string"
              ? body.error
              : "Thido is working across the whole document.",
          );
          void pollForDocumentUnlock();
        }
        return { ok: false, body };
      } catch {
        setSaveState("error");
        return { ok: false, body: null };
      }
    });

    saveChainRef.current = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  async function reloadLatestDocument() {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        cache: "no-store",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.document) {
        throw new Error("Could not load the latest document.");
      }
      const latest = body.document as {
        title: string;
        content: JSONContent | null;
        revision: number;
      };
      setTitle(latest.title);
      editorRef.current?.commands.setContent(latest.content ?? "", {
        emitUpdate: false,
      });
      pendingSaveRef.current = null;
      conflictRef.current = false;
      setDocumentConflict(null);
      updateRevision(latest.revision);
      setSaveState("saved");
    } catch (error) {
      setCommentError(
        error instanceof Error
          ? error.message
          : "Could not load the latest document.",
      );
    }
  }

  function handleDocumentRestored(document: RestoredDocument) {
    setTitle(document.title);
    editorRef.current?.commands.setContent(document.content ?? "", {
      emitUpdate: false,
    });
    pendingSaveRef.current = null;
    conflictRef.current = false;
    setDocumentConflict(null);
    updateRevision(document.revision);
    setSaveState("saved");
  }

  function handleDocumentConflict(message: string) {
    conflictRef.current = true;
    setDocumentConflict(message);
    setSaveState("error");
  }

  function startComment() {
    if (!editor || documentAiLockedRef.current) return;
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
    if (documentAiLockedRef.current) return;
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
    if (!activeComposer || documentAiLockedRef.current) return;
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
    let existingDocumentLock = false;
    if (waitForAi) {
      setForegroundCommentCount((count) => count + 1);
      updateDocumentAiLock(true);
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
      const pendingSave = pendingSaveRef.current;
      pendingSaveRef.current = null;
      const saveResult = await saveDocumentUpdate({
        ...pendingSave,
        content: editor.getJSON(),
      });
      if (!saveResult.ok) {
        const errorBody = saveResult.body;
        if (errorBody?.documentAiLocked === true) {
          existingDocumentLock = true;
          updateDocumentAiLock(true);
          void pollForDocumentUnlock();
        }
        throw new Error(
          typeof errorBody?.error === "string"
            ? errorBody.error
            : composer.scope === "DOCUMENT"
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
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        if (errorBody?.documentAiLocked === true) {
          existingDocumentLock = true;
          updateDocumentAiLock(true);
          void pollForDocumentUnlock();
        }
        throw new Error(
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Could not create comment",
        );
      }
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
        editor.commands.setContent(data.documentContent, { emitUpdate: false });
        if (typeof data.documentRevision === "number") {
          updateRevision(data.documentRevision);
        }
        if (savedComment.suggestion?.status === "AUTO_APPLIED") {
          setRecentThidoChange(savedComment.suggestion);
        }
      }
    } catch (error) {
      if (!mountedRef.current) return;
      setSaveState("error");
      setCommentError(
        error instanceof Error
          ? error.message
          : "The comment could not be saved. You can keep editing and try again.",
      );
    } finally {
      if (waitForAi && mountedRef.current) {
        setForegroundCommentCount((count) => Math.max(0, count - 1));
        if (!existingDocumentLock) {
          updateDocumentAiLock(false);
        }
      }
    }
  }

  const pollForAiResponse = useCallback(async (commentId: string) => {
    for (let attempt = 0; attempt < 480; attempt += 1) {
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
        updateDocumentAiLock(data.documentAiLocked === true);
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
            editorRef.current.commands.setContent(data.documentContent, {
              emitUpdate: false,
            });
            if (typeof data.documentRevision === "number") {
              updateRevision(data.documentRevision);
            }
            setRecentThidoChange(target.suggestion);
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
  }, [documentId, updateDocumentAiLock, updateRevision]);

  const pollForDocumentUnlock = useCallback(async () => {
    for (let attempt = 0; attempt < 480; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1250));
      if (!mountedRef.current) return;

      try {
        const response = await fetch(
          `/api/documents/${documentId}/comments`,
          { cache: "no-store" },
        );
        if (!response.ok) continue;
        const data = await response.json();
        const locked = data.documentAiLocked === true;
        const progress =
          (data.aiProgress as Record<string, CommentAiProgress> | undefined) ??
          {};

        setComments(data.comments as CommentWithReplies[]);
        setCommentProgress(progress);
        setPendingCommentIds(
          new Set(
            Object.entries(progress).flatMap(([commentId, item]) =>
              item.status === "PENDING" ? [commentId] : [],
            ),
          ),
        );
        updateDocumentAiLock(locked);

        if (!locked) {
          if (data.documentContent && editorRef.current) {
            editorRef.current.commands.setContent(data.documentContent, {
              emitUpdate: false,
            });
            if (typeof data.documentRevision === "number") {
              updateRevision(data.documentRevision);
            }
          }
          return;
        }
      } catch {
        // The next polling attempt can recover from a transient refresh error.
      }
    }
  }, [documentId, updateDocumentAiLock, updateRevision]);

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

  function handleDocumentContentUpdated(
    content: unknown,
    suggestion: SuggestionWithStatus,
    nextRevision?: number,
  ) {
    if (content && editor) {
      editor.commands.setContent(content as JSONContent, { emitUpdate: false });
      if (typeof nextRevision === "number") updateRevision(nextRevision);
      setRecentThidoChange(suggestion);
    }
  }

  return (
    <div className="print-document-layout flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="print-document-layout flex w-full min-w-0 flex-1 flex-col gap-6 px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
        <header className="print-hidden flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              All documents
            </Link>
            <UserMenu user={currentUser} />
          </div>
        </header>
        <div className="print-hidden mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <input
            value={title}
            readOnly={!canEditNow}
            onChange={(e) => {
              if (!canEditNow) return;
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
            aria-label="Document title"
            className={`editor-title w-full border-none bg-transparent font-serif text-3xl font-normal tracking-[-0.035em] outline-none sm:text-4xl ${
              canEditNow ? "" : "cursor-default"
            }`}
          />
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-[var(--muted-soft)]">
              {documentAiLocked
                ? "Thido is revising…"
                : saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "Saved"
                    : saveState === "error"
                      ? "Save failed"
                      : null}
            </span>
            {!canEdit && (
              <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">
                {canComment ? "Comment access" : "View only"}
              </span>
            )}
            <PrintDocumentButton />
            <DocumentFileActions
              documentId={documentId}
              currentRevision={revision}
              canImport={canEditNow}
              onImport={handleDocumentRestored}
              onConflict={handleDocumentConflict}
            />
            {canEdit && (
              <VersionHistoryControl
                documentId={documentId}
                currentRevision={revision}
                onRestore={handleDocumentRestored}
                onConflict={handleDocumentConflict}
              />
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

        <h1 className="print-document-title editor-title hidden font-serif text-4xl font-normal tracking-[-0.035em]">
          {title}
        </h1>

        {commentError && (
          <p className="print-hidden text-xs text-[var(--danger)]" role="alert">
            {commentError}
          </p>
        )}

        {documentConflict && (
          <div
            className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border border-[var(--warm)] bg-[var(--surface)] px-4 py-3 text-sm"
            role="alert"
          >
            <div>
              <p className="font-semibold">Your copy is out of date.</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {documentConflict} Copy any unsaved text you need before
                reloading.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void reloadLatestDocument()}
              className="secondary-button rounded-md px-3 py-2 text-xs font-medium"
            >
              Reload latest version
            </button>
          </div>
        )}

        {recentThidoChange && (
          <div className="print-hidden">
            <RecentThidoChangeNotice
              suggestion={recentThidoChange}
              onDismiss={() => setRecentThidoChange(null)}
            />
          </div>
        )}

        {startedFromPaste && !initialContent && (
          <div className="print-hidden mx-auto w-full max-w-6xl border-l-2 border-[var(--warm)] pl-4">
            <p className="text-sm font-medium">Paste your document below.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              When it is saved, highlight any passage and choose Comment to
              ask Thido a question or request a change.
            </p>
          </div>
        )}

        <div
          className="print-document-panel app-panel mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-sm"
          aria-busy={documentAiLocked}
        >
          {canEditNow && (
            <div className="print-hidden">
              <Toolbar editor={editor} documentId={documentId} />
            </div>
          )}
          {editor && canCommentNow && (
            <BubbleMenu editor={editor}>
              <div className="print-hidden app-panel flex items-center gap-1 rounded-sm p-1">
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
          <div className="print-document-content flex-1 overflow-y-auto px-4 py-7 sm:px-7 sm:py-10 lg:px-8">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="print-hidden flex min-h-72 w-full shrink-0 flex-col border-t border-[var(--border)] lg:min-h-0 lg:w-80 lg:border-t-0">
        {activeComposer && !documentAiLocked && (
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
          documentAiLocked={documentAiLocked}
          onStartDocumentComment={startDocumentComment}
          documentComposerOpen={activeComposer?.scope === "DOCUMENT"}
          canCreateComments={canCommentNow && !!editor}
          canManageComments={canEditNow}
        />
      </div>
    </div>
  );
}
