"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { Toolbar } from "./Toolbar";
import { DocumentOutline } from "./DocumentOutline";
import { DocumentTabs } from "./DocumentTabs";
import { TableContextMenu } from "./TableContextMenu";
import { TableConversionDialog } from "./TableConversionDialog";
import { useEditorHashNavigation } from "./useEditorHashNavigation";
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
import { type RestoredDocument } from "@/components/documents/VersionHistoryControl";
import { Brand } from "@/components/Brand";
import type {
  CommentAiProgress,
  CommentWithReplies,
  SuggestionWithStatus,
} from "@/lib/types";
import { isDocumentWideCommentRequest } from "@/lib/commentProcessing";
import {
  createLocalizedDefaultDocumentTitle,
  hasMeaningfulDocumentContent,
  inferDocumentTitle,
  isDefaultDocumentTitle,
} from "@/lib/documentPersistence";
import { documentEditPath, documentTabTitle } from "@/lib/documentUrls";
import {
  detectTextTable,
  plainTextToTiptapNodes,
  textTableToTiptapNode,
  type DetectedTextTable,
} from "@/lib/textTable";
import {
  DOCUMENT_IMPORT_NOTES_NOTICE_MS,
  DOCUMENT_IMPORT_SUCCESS_NOTICE_MS,
  isSupportedDocumentFileName,
  SUPPORTED_DOCUMENT_FILE_LABEL,
} from "@/lib/documentFileTypes";
import { hasHtmlTable } from "./extensions/GoogleDocsPaste";

type Props = {
  documentId: string;
  initialTitle: string;
  initialTitleManuallySet: boolean;
  initialCreatedAt: string;
  initialContent: JSONContent | null;
  initialRevision: number;
  initialComments: CommentWithReplies[];
  initialCommentProgress: Record<string, CommentAiProgress>;
  initialDocumentAiLocked: boolean;
  initialShareToken: string | null;
  initialSharePermission: CollaboratorPermission;
  initialLinkAccesses: Array<{
    userId: string;
    name: string | null;
    email: string | null;
    lastAccessedAt: string;
  }>;
  initialCollaborators: CollaboratorSummary[];
  accessPermission: CollaboratorPermission;
  currentUser: UserMenuProfile;
  startedFromPaste?: boolean;
  checklistMoveControls?: boolean;
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
type PendingTablePaste = {
  from: number;
  originalText: string;
  table: DetectedTextTable;
  to: number;
};

const BROADER_SCOPE_PROMPT = /\b(paragraph|section|intro|introduction|conclusion|opening|closing|entire|whole|overall)\b/i;
const subscribeToHydration = () => () => undefined;

export function TiptapEditor({
  documentId,
  initialTitle,
  initialTitleManuallySet,
  initialCreatedAt,
  initialContent,
  initialRevision,
  initialComments,
  initialCommentProgress,
  initialDocumentAiLocked,
  initialShareToken,
  initialSharePermission,
  initialLinkAccesses,
  initialCollaborators,
  accessPermission,
  currentUser,
  startedFromPaste = false,
  checklistMoveControls = true,
}: Props) {
  const canComment = accessPermission !== "VIEW";
  const canEdit =
    accessPermission === "EDIT" || accessPermission === "FULL";
  const canManage = accessPermission === "FULL";
  const [title, setTitle] = useState(initialTitle);
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const visibleTitle =
    hasHydrated &&
    !initialTitleManuallySet &&
    isDefaultDocumentTitle(initialTitle) &&
    title === initialTitle
      ? createLocalizedDefaultDocumentTitle(new Date(initialCreatedAt))
      : title;
  const [revision, setRevision] = useState(initialRevision);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [documentConflict, setDocumentConflict] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentWithReplies[]>(initialComments);
  const [activeComposer, setActiveComposer] = useState<ActiveComposer | null>(null);
  const [commentsSidebarOpen, setCommentsSidebarOpen] = useState(
    initialComments.length > 0,
  );
  const [documentOutlineOpen, setDocumentOutlineOpen] = useState(false);
  const [editorZoom, setEditorZoom] = useState(100);
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
  const [pendingTablePaste, setPendingTablePaste] =
    useState<PendingTablePaste | null>(null);
  const [fileDragActive, setFileDragActive] = useState(false);
  const [documentImportMessage, setDocumentImportMessage] = useState<{
    dismissAfterMs?: number;
    kind: "error" | "loading" | "success";
    text: string;
  } | null>(null);
  const documentImportDismissAfterMs =
    documentImportMessage?.dismissAfterMs;
  const documentImportMessageText = documentImportMessage?.text;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{
    title?: string;
    titleUpdateSource?: "AUTO" | "USER";
    content?: JSONContent;
  } | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const revisionRef = useRef(initialRevision);
  const conflictRef = useRef(false);
  const mountedRef = useRef(true);
  const documentAiLockedRef = useRef(initialDocumentAiLocked);
  const titleRef = useRef(initialTitle);
  const titleManuallySetRef = useRef(initialTitleManuallySet);
  const pendingTablePasteRef = useRef<PendingTablePaste | null>(null);
  const documentImportingRef = useRef(false);
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

  function replaceDocumentUrl(savedTitle: string) {
    const path = documentEditPath(documentId, savedTitle);
    const nextUrl = `${path}${window.location.search}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }

  useEffect(() => {
    document.title = documentTabTitle(visibleTitle);
  }, [visibleTitle]);

  useEffect(() => {
    if (!documentImportDismissAfterMs || !documentImportMessageText) return;
    const timeout = window.setTimeout(() => {
      setDocumentImportMessage((current) =>
        current?.text === documentImportMessageText ? null : current,
      );
    }, documentImportDismissAfterMs);
    return () => window.clearTimeout(timeout);
  }, [documentImportDismissAfterMs, documentImportMessageText]);

  const editor = useEditor({
    extensions: getEditorExtensions({
      taskItemControls: checklistMoveControls,
    }),
    content: initialContent ?? "",
    editable: canEditNow,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[60vh] focus:outline-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-blockquote:text-[var(--muted)]",
      },
      handlePaste: (view, event) => {
        if (
          !canEdit ||
          documentAiLockedRef.current ||
          pendingTablePasteRef.current
        ) {
          return false;
        }
        const originalText = event.clipboardData?.getData("text/plain") ?? "";
        const clipboardHtml = event.clipboardData?.getData("text/html") ?? "";
        if (hasHtmlTable(clipboardHtml)) return false;
        const table = detectTextTable(originalText);
        if (!table) return false;

        event.preventDefault();
        const pending = {
          from: view.state.selection.from,
          originalText,
          table,
          to: view.state.selection.to,
        };
        pendingTablePasteRef.current = pending;
        setPendingTablePaste(pending);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const file = event.dataTransfer?.files?.[0];
        if (moved || !file || !canEdit || documentAiLockedRef.current) {
          return false;
        }

        event.preventDefault();
        setFileDragActive(false);
        if (documentImportingRef.current) return true;
        if (hasMeaningfulDocumentContent(view.state.doc.toJSON())) {
          setDocumentImportMessage({
            kind: "error",
            text: "Drop a document into a blank Thido document. Use the File or Tools menu to replace a document that already has content.",
          });
          return true;
        }
        if (!isSupportedDocumentFileName(file.name)) {
          setDocumentImportMessage({
            kind: "error",
            text: `Thido can import ${SUPPORTED_DOCUMENT_FILE_LABEL}.`,
          });
          return true;
        }

        void importDroppedDocument(file);
        return true;
      },
    },
    onCreate: ({ editor }) => {
      if (titleManuallySetRef.current) return;
      const inferredTitle = inferDocumentTitle(editor.getJSON());
      if (!inferredTitle || inferredTitle === titleRef.current) return;

      titleRef.current = inferredTitle;
      setTitle(inferredTitle);
      scheduleSave({ title: inferredTitle, titleUpdateSource: "AUTO" });
    },
    onUpdate: ({ editor }) => {
      if (!documentAiLockedRef.current && (canEdit || canComment)) {
        const content = editor.getJSON();
        const inferredTitle = titleManuallySetRef.current
          ? null
          : inferDocumentTitle(content);
        if (inferredTitle && inferredTitle !== titleRef.current) {
          titleRef.current = inferredTitle;
          setTitle(inferredTitle);
          scheduleSave({
            content,
            title: inferredTitle,
            titleUpdateSource: "AUTO",
          });
          return;
        }
        scheduleSave({ content });
      }
    },
  });
  const editorRef = useRef(editor);
  useEditorHashNavigation(editor);

  const insertPendingTablePaste = useCallback((convertToTable: boolean) => {
    const pending = pendingTablePasteRef.current;
    const currentEditor = editorRef.current;
    if (!pending || !currentEditor) return;

    pendingTablePasteRef.current = null;
    setPendingTablePaste(null);
    const maximumPosition = currentEditor.state.doc.content.size;
    const from = Math.min(pending.from, maximumPosition);
    const to = Math.min(Math.max(pending.to, from), maximumPosition);
    currentEditor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .insertContent(
        convertToTable
          ? textTableToTiptapNode(pending.table)
          : plainTextToTiptapNodes(pending.originalText),
      )
      .run();
  }, []);

  const convertPendingTablePaste = useCallback(() => {
    insertPendingTablePaste(true);
  }, [insertPendingTablePaste]);

  const keepPendingTablePasteAsText = useCallback(() => {
    insertPendingTablePaste(false);
  }, [insertPendingTablePaste]);

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

  useEffect(() => {
    function toggleCommentsSidebar(event: KeyboardEvent) {
      const commandModifier = event.metaKey || event.ctrlKey;
      if (
        !commandModifier ||
        !event.altKey ||
        !event.shiftKey ||
        event.code !== "KeyA" ||
        event.repeat
      ) {
        return;
      }

      event.preventDefault();
      setCommentsSidebarOpen((open) => !open);
    }

    document.addEventListener("keydown", toggleCommentsSidebar);
    return () => document.removeEventListener("keydown", toggleCommentsSidebar);
  }, []);

  function scheduleSave(next: {
    title?: string;
    titleUpdateSource?: "AUTO" | "USER";
    content?: JSONContent;
  }) {
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
    titleUpdateSource?: "AUTO" | "USER";
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
            | { revision?: unknown; title?: unknown }
            | undefined;
          if (typeof savedDocument?.revision === "number") {
            updateRevision(savedDocument.revision);
          }
          if (typeof savedDocument?.title === "string") {
            replaceDocumentUrl(savedDocument.title);
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
        titleManuallySet: boolean;
        content: JSONContent | null;
        revision: number;
      };
      setTitle(latest.title);
      titleRef.current = latest.title;
      titleManuallySetRef.current = latest.titleManuallySet;
      replaceDocumentUrl(latest.title);
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
    titleRef.current = document.title;
    replaceDocumentUrl(document.title);
    if (typeof document.titleManuallySet === "boolean") {
      titleManuallySetRef.current = document.titleManuallySet;
    }
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

  async function importDroppedDocument(file: File) {
    documentImportingRef.current = true;
    setDocumentImportMessage({
      kind: "loading",
      text: `Importing ${file.name}…`,
    });
    setCommentError(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    pendingSaveRef.current = null;

    try {
      await saveChainRef.current;
      const formData = new FormData();
      formData.set("file", file);
      formData.set("baseRevision", String(revisionRef.current));
      const response = await fetch(`/api/documents/${documentId}/import`, {
        method: "POST",
        body: formData,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.document) {
        if (body?.documentConflict === true) {
          handleDocumentConflict(
            typeof body.error === "string"
              ? body.error
              : "This document changed somewhere else.",
          );
        }
        throw new Error(body?.error || "Could not import this document.");
      }

      handleDocumentRestored(body.document as RestoredDocument);
      const warnings = Array.isArray(body.warnings)
        ? body.warnings.filter((warning: unknown) => typeof warning === "string")
        : [];
      setDocumentImportMessage({
        dismissAfterMs:
          warnings.length > 0
            ? DOCUMENT_IMPORT_NOTES_NOTICE_MS
            : DOCUMENT_IMPORT_SUCCESS_NOTICE_MS,
        kind: "success",
        text:
          warnings.length > 0
            ? `${file.name} is now editable. Import notes: ${warnings.join(" ")}`
            : `${file.name} is now an editable Thido document.`,
      });
    } catch (reason) {
      setDocumentImportMessage({
        kind: "error",
        text:
          reason instanceof Error
            ? reason.message
            : "Could not import this document.",
      });
    } finally {
      documentImportingRef.current = false;
    }
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
    setCommentsSidebarOpen(true);
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
    setCommentsSidebarOpen(true);
    setActiveComposer({ scope: "DOCUMENT" });
  }

  function startAiEdit() {
    if (!editor || documentAiLockedRef.current) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      startComment();
      return;
    }
    startDocumentComment();
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
      <div className="print-document-layout flex w-full min-w-0 flex-1 flex-col gap-3 px-2 py-3 sm:px-3 lg:px-4">
        <div className="print-hidden sticky top-0 z-30 flex flex-col gap-3 bg-[var(--background)]">
        <header className="mx-auto flex w-full max-w-none flex-col gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Brand href="/dashboard" />
            <div className="min-w-0 flex-1">
              <input
                value={visibleTitle}
                readOnly={!canEditNow}
                onChange={(event) => {
                  if (!canEditNow) return;
                  const nextTitle = event.target.value;
                  titleRef.current = nextTitle;
                  titleManuallySetRef.current = true;
                  setTitle(nextTitle);
                  scheduleSave({
                    title: nextTitle,
                    titleUpdateSource: "USER",
                  });
                }}
                aria-label="Document title"
                className={`w-full truncate rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-lg font-medium tracking-tight outline-none hover:border-[var(--border)] focus:border-[var(--border-strong)] ${
                  canEditNow ? "" : "cursor-default"
                }`}
              />
              <div className="flex min-h-5 items-center gap-2 px-1">
                <span className="text-[11px] text-[var(--muted-soft)]">
                  {documentAiLocked
                    ? "Thido is revising…"
                    : saveState === "saving"
                      ? "Saving…"
                      : saveState === "saved"
                        ? "Saved"
                        : saveState === "error"
                          ? "Save failed"
                          : "All changes save automatically"}
                </span>
                {!canEdit ? (
                  <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                    {canComment ? "Comment access" : "View only"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              aria-controls="document-comments-sidebar"
              aria-expanded={commentsSidebarOpen}
              aria-keyshortcuts="Control+Alt+Shift+A Meta+Alt+Shift+A"
              aria-label={`${commentsSidebarOpen ? "Hide" : "Show"} comments`}
              title={`${commentsSidebarOpen ? "Hide" : "Show"} comments (Ctrl/⌘ + Alt + Shift + A)`}
              onClick={() => setCommentsSidebarOpen((open) => !open)}
              className={`secondary-button inline-flex size-10 items-center justify-center rounded-full ${
                commentsSidebarOpen ? "bg-[var(--surface-subtle)]" : ""
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-5 w-5"
              >
                <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
                <path d="M15.5 4v16M7 8h5M7 12h5" />
              </svg>
            </button>
            {canManage && (
              <ShareDocumentControl
                documentId={documentId}
                initialShareToken={initialShareToken}
                initialSharePermission={initialSharePermission}
                initialLinkAccesses={initialLinkAccesses}
                initialCollaborators={initialCollaborators}
              />
            )}
            <UserMenu user={currentUser} />
          </div>
        </header>

        <div className="mx-auto w-full max-w-none">
          <Toolbar
            editor={editor}
            documentId={documentId}
            currentRevision={revision}
            canEdit={canEditNow}
            canViewHistory={canEdit}
            commentsOpen={commentsSidebarOpen}
            outlineOpen={documentOutlineOpen}
            zoom={editorZoom}
            onToggleComments={() =>
              setCommentsSidebarOpen((open) => !open)
            }
            onToggleOutline={() =>
              setDocumentOutlineOpen((open) => !open)
            }
            onEditWithAi={startAiEdit}
            onZoomChange={setEditorZoom}
            onImport={handleDocumentRestored}
            onConflict={handleDocumentConflict}
          />
        </div>

        <DocumentTabs editor={editor} />
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
            className="mx-auto flex w-full max-w-none flex-wrap items-center justify-between gap-3 border border-[var(--warm)] bg-[var(--surface)] px-4 py-3 text-sm"
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
          <div className="print-hidden mx-auto w-full max-w-none border-l-2 border-[var(--warm)] pl-4">
            <p className="text-sm font-medium">Paste your document below.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              When it is saved, highlight any passage to target it, or choose
              Edit with Thido to add, remove, or rewrite content across the
              document.
            </p>
          </div>
        )}

        {documentImportMessage ? (
          <p
            className={`print-hidden mx-auto w-full max-w-none border-l-2 px-3 py-2 text-xs leading-5 ${
              documentImportMessage.kind === "error"
                ? "border-[var(--danger)] text-[var(--danger)]"
                : "border-[var(--accent-strong)] text-[var(--muted)]"
            }`}
            role={documentImportMessage.kind === "error" ? "alert" : "status"}
          >
            {documentImportMessage.text}
          </p>
        ) : null}

        <div
          className="print-document-panel app-panel relative mx-auto flex w-full max-w-none flex-1 flex-col overflow-hidden rounded-sm"
          aria-busy={
            documentAiLocked || documentImportMessage?.kind === "loading"
          }
          onDragEnter={(event) => {
            if (!canEditNow || !event.dataTransfer.types.includes("Files")) return;
            setFileDragActive(true);
          }}
          onDragOver={(event) => {
            if (!canEditNow || !event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setFileDragActive(false);
            }
          }}
          onDrop={() => setFileDragActive(false)}
        >
          {fileDragActive ? (
            <div className="pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-md border-2 border-dashed border-[var(--accent-strong)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] p-6 text-center">
              <div>
                <p className="font-semibold">Drop to import this document</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Blank documents accept {SUPPORTED_DOCUMENT_FILE_LABEL} files.
                </p>
              </div>
            </div>
          ) : null}
          {editor && canCommentNow && (
            <BubbleMenu editor={editor}>
              <div className="print-hidden app-panel flex items-center gap-1 rounded-sm p-1">
                <button
                  type="button"
                  onClick={startComment}
                  className="rounded-sm px-2 py-1 text-xs font-medium hover:bg-[var(--surface-subtle)]"
                >
                  Edit or ask Thido
                </button>
              </div>
            </BubbleMenu>
          )}
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {documentOutlineOpen && editor ? (
              <DocumentOutline
                editor={editor}
                canEdit={canEditNow}
                onClose={() => setDocumentOutlineOpen(false)}
              />
            ) : null}
            <div className="print-document-content min-w-0 flex-1 overflow-y-auto py-6 sm:py-8">
              <div
                className="editor-zoom"
                style={{ zoom: editorZoom / 100 }}
                data-zoom={`${editorZoom}%`}
              >
                {editor && canEditNow ? (
                  <TableContextMenu editor={editor}>
                    <EditorContent editor={editor} />
                  </TableContextMenu>
                ) : (
                  <EditorContent editor={editor} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {commentsSidebarOpen && (
        <div
          id="document-comments-sidebar"
          className="print-hidden flex min-h-72 w-full shrink-0 flex-col border-t border-[var(--border)] lg:min-h-0 lg:w-80 lg:border-t-0"
        >
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
      )}
      {pendingTablePaste ? (
        <TableConversionDialog
          table={pendingTablePaste.table}
          onConvert={convertPendingTablePaste}
          onKeepText={keepPendingTablePasteAsText}
        />
      ) : null}
    </div>
  );
}
