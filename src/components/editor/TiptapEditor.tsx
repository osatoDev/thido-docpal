"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { hasDayHeaders, todayDay } from "@/lib/documentDays";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { ConflictRecovery } from "@/components/conflicts/ConflictRecovery";
import { Toolbar } from "./Toolbar";
import { AUTOSAVE_DELAY_SECONDS } from "@/lib/autosave";
import { AutosaveStatus, type SaveState } from "./AutosaveStatus";
import { applyDocumentPreferencesToDom } from "./extensions/DocumentPreferences";
import { DocumentOutline } from "./DocumentOutline";
import { DocumentTabs } from "./DocumentTabs";
import { PlannerBar } from "./PlannerBar";
import { TableContextMenu } from "./TableContextMenu";
import { TableConversionDialog } from "./TableConversionDialog";
import { useEditorHashNavigation } from "./useEditorHashNavigation";
import {
  UserMenu,
  type UserMenuProfile,
} from "@/components/account/UserMenu";
import { type RestoredDocument } from "@/components/documents/VersionHistoryControl";
import { Brand } from "@/components/Brand";
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
  currentUser: UserMenuProfile;
  /** The person's one plan: fixed title, planner bar, today's day on first open. */
  isPlan?: boolean;
  checklistMoveControls?: boolean;
};

type DocumentSave = {
  title?: string;
  titleUpdateSource?: "AUTO" | "USER";
  content?: JSONContent;
};
type PendingTablePaste = {
  from: number;
  originalText: string;
  table: DetectedTextTable;
  to: number;
};

const subscribeToHydration = () => () => undefined;
const OUTLINE_EXPANDED_KEY = "thido-outline-expanded";

function readOutlineExpanded() {
  try {
    return typeof window === "undefined" ||
      window.localStorage.getItem(OUTLINE_EXPANDED_KEY) !== "false";
  } catch {
    // Storage can be unavailable (private mode); stay expanded.
    return true;
  }
}

export function TiptapEditor({
  documentId,
  initialTitle,
  initialTitleManuallySet,
  initialCreatedAt,
  initialContent,
  initialRevision,
  currentUser,
  isPlan = false,
  checklistMoveControls = true,
}: Props) {
  const autosaveDelayMs = AUTOSAVE_DELAY_SECONDS * 1000;
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
  const [saveDeadline, setSaveDeadline] = useState<number | null>(null);
  const [documentConflict, setDocumentConflict] = useState<string | null>(null);
  // The outline is always shown; whether it is expanded is a per-browser
  // preference. It renders only after the editor mounts, so reading storage
  // here cannot cause a hydration mismatch.
  const [documentOutlineOpen, setDocumentOutlineOpen] = useState(readOutlineExpanded);
  const toggleDocumentOutline = useCallback(() => {
    setDocumentOutlineOpen((open) => {
      try {
        window.localStorage.setItem(OUTLINE_EXPANDED_KEY, String(!open));
      } catch {
        // Not remembering the choice is fine.
      }
      return !open;
    });
  }, []);
  const [editorZoom, setEditorZoom] = useState(100);
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
  const pendingSaveRef = useRef<DocumentSave | null>(null);
  const failedSaveRef = useRef<DocumentSave | null>(null);
  const saveVersionRef = useRef(0);
  const unsavedChangesRef = useRef(false);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const revisionRef = useRef(initialRevision);
  const conflictRef = useRef(false);
  const mountedRef = useRef(true);
  const titleRef = useRef(initialTitle);
  const titleManuallySetRef = useRef(initialTitleManuallySet);
  const pendingTablePasteRef = useRef<PendingTablePaste | null>(null);
  const documentImportingRef = useRef(false);
  const canEditNow = !documentConflict;

  const updateRevision = useCallback((nextRevision: number) => {
    revisionRef.current = nextRevision;
    setRevision(nextRevision);
  }, []);

  function replaceDocumentUrl(savedTitle: string) {
    if (isPlan) return;
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
        if (pendingTablePasteRef.current) return false;
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
        if (moved || !file) return false;

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
    onUpdate: ({ editor, transaction, appendedTransactions }) => {
      // Editability/selection updates are not unsaved document changes.
      if (!transaction.docChanged && !appendedTransactions.some((tr) => tr.docChanged)) return;
      const content = editor.getJSON();
      const inferredTitle = isPlan || titleManuallySetRef.current
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
    },
  });
  const editorRef = useRef(editor);
  useEditorHashNavigation(editor);

  // Mirror the document-preferences node onto the ProseMirror DOM node. The
  // DocumentPreferences extension already does this from a plugin view, but a
  // React-side effect keyed on the editor guarantees the side-margin and
  // appearance data attributes are (re)applied after remounts and content
  // resets, which is where the View menu's side-margin control was silently
  // losing effect.
  useEffect(() => {
    if (!editor) return;
    const apply = () =>
      applyDocumentPreferencesToDom(editor.view.dom as HTMLElement, editor.state.doc);
    apply();
    editor.on("transaction", apply);
    return () => {
      editor.off("transaction", apply);
    };
  }, [editor]);

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
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!unsavedChangesRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function guardLinkNavigation(event: MouseEvent) {
      if (!unsavedChangesRef.current || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download") ||
        (link.target && link.target !== "_self")) return;
      const target = new URL(link.href, window.location.href);
      if (!/^https?:$/.test(target.protocol)) return;
      if (target.origin === window.location.origin && target.pathname === window.location.pathname &&
        target.search === window.location.search) return;
      if (!window.confirm("Leave this page? Your latest changes are not saved. Choose Cancel to stay and save.")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", guardLinkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", guardLinkNavigation, true);
    };
  }, []);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // A new plan opens on today, ready for its first task. Only the browser
  // knows the person's local date, so this runs here rather than on create.
  const seededPlanRef = useRef(false);
  useEffect(() => {
    if (!isPlan || !editor || seededPlanRef.current) return;
    seededPlanRef.current = true;
    const doc = editor.state.doc;
    if (hasDayHeaders(doc) || hasMeaningfulDocumentContent(doc.toJSON())) return;
    editor
      .chain()
      .insertContentAt(0, [
        { type: "dayHeader", attrs: { date: todayDay() } },
        {
          type: "taskList",
          content: [{ type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph" }] }],
        },
      ])
      // Inside the new task: header (0-1), list (2), item (3), paragraph (4).
      .setTextSelection(5)
      .focus()
      .run();
  }, [editor, isPlan]);

  useEffect(() => {
    // Tiptap emits an update by default, even when the content is unchanged.
    editor?.setEditable(canEditNow, false);
  }, [canEditNow, editor]);

  function scheduleSave(next: DocumentSave) {
    if (conflictRef.current) return;
    unsavedChangesRef.current = true;
    saveVersionRef.current += 1;
    pendingSaveRef.current = { ...pendingSaveRef.current, ...next };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Tiptap invokes this from editor events, never during React rendering.
    // eslint-disable-next-line react-hooks/purity
    setSaveDeadline(Date.now() + autosaveDelayMs);
    setSaveState("waiting");
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (pending) void saveDocumentUpdate(pending);
    }, autosaveDelayMs);
  }

  function saveNow() {
    if (conflictRef.current) return;
    if (!pendingSaveRef.current && !failedSaveRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    const pending = { ...failedSaveRef.current, ...pendingSaveRef.current };
    pendingSaveRef.current = null;
    void saveDocumentUpdate(pending);
  }


  function saveDocumentUpdate(next: DocumentSave) {
    const saveVersion = ++saveVersionRef.current;
    unsavedChangesRef.current = true;
    setSaveDeadline(null);
    setSaveState("saving");
    const operation = saveChainRef.current.then(async () => {
      if (conflictRef.current) {
        return { ok: false, body: { documentConflict: true } };
      }
      // Carry a failed title/content update into the next attempt. Newer fields win.
      const payload = { ...failedSaveRef.current, ...next };
      failedSaveRef.current = null;
      try {
        const response = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
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
          if (saveVersion === saveVersionRef.current && !pendingSaveRef.current) {
            unsavedChangesRef.current = false;
            setSaveState("saved");
          }
          return { ok: true, body };
        }

        failedSaveRef.current = payload;
        if (saveVersion === saveVersionRef.current) setSaveState("error");
        if (body?.documentConflict === true) {
          conflictRef.current = true;
          setSaveState("error");
          setDocumentConflict(
            typeof body.error === "string"
              ? body.error
              : "This document changed somewhere else.",
          );
        }
        return { ok: false, body };
      } catch {
        failedSaveRef.current = payload;
        if (saveVersion === saveVersionRef.current) setSaveState("error");
        return { ok: false, body: null };
      }
    });

    saveChainRef.current = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  function resetPendingSaves() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    pendingSaveRef.current = null;
    failedSaveRef.current = null;
    saveVersionRef.current += 1;
    unsavedChangesRef.current = false;
    setSaveDeadline(null);
  }

  async function reloadLatestDocument() {
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
    resetPendingSaves();
    conflictRef.current = false;
    setDocumentConflict(null);
    updateRevision(latest.revision);
    setSaveState("saved");
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
    resetPendingSaves();
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

  useEffect(() => {
    function handleSaveShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey ||
        event.key.toLowerCase() !== "s" || event.isComposing) return;
      // Suppress the browser's Save Page dialog, including repeated keydowns.
      event.preventDefault();
      if (!event.repeat) saveNow();
    }
    document.addEventListener("keydown", handleSaveShortcut, true);
    return () => document.removeEventListener("keydown", handleSaveShortcut, true);
  });

  return (
    <div className="print-document-layout flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="print-document-layout flex w-full min-w-0 flex-1 flex-col gap-3 px-2 py-3 sm:px-3 lg:px-4">
        <div className="print-hidden sticky top-0 z-30 flex flex-col gap-3 bg-[var(--background)]">
        <header className="mx-auto flex w-full max-w-none flex-col gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Brand href="/plan" showWordmark={false} />
            <div className="min-w-0 flex-1">
              {isPlan ? (
                <h1 className="truncate px-1 py-0.5 font-display text-lg font-semibold tracking-tight">
                  {title}
                </h1>
              ) : (
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
              )}
              <div className="flex min-h-5 items-center gap-2 px-1">
                <AutosaveStatus
                  delayMs={autosaveDelayMs}
                  state={saveState}
                  deadline={saveDeadline}
                  conflicted={documentConflict !== null}
                  onSaveNow={saveNow}
                />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <UserMenu user={currentUser} />
          </div>
        </header>

        <div className="mx-auto w-full max-w-none">
          <Toolbar
            editor={editor}
            documentId={documentId}
            currentRevision={revision}
            canEdit={canEditNow}
            canViewHistory
            outlineOpen={documentOutlineOpen}
            zoom={editorZoom}
            onToggleOutline={toggleDocumentOutline}
            onZoomChange={setEditorZoom}
            onImport={handleDocumentRestored}
            onConflict={handleDocumentConflict}
          />
        </div>

        <DocumentTabs editor={editor} />
        </div>

        <h1 className="print-document-title editor-title hidden font-display text-4xl font-normal tracking-[-0.035em]">
          {title}
        </h1>

        {documentConflict && (
          <ConflictRecovery
            getText={() => `${titleRef.current}\n\n${editorRef.current?.getText() ?? ""}`}
            onReload={reloadLatestDocument}
          />
        )}

        {documentImportMessage ? (
          <p
            className={`print-hidden mx-auto flex w-full max-w-none items-center gap-2 border-l-2 px-3 py-2 text-xs leading-5 ${
              documentImportMessage.kind === "error"
                ? "border-[var(--danger)] text-[var(--danger)]"
                : "border-[var(--accent-strong)] text-[var(--muted)]"
            }`}
            role={documentImportMessage.kind === "error" ? "alert" : "status"}
          >
            {documentImportMessage.kind === "loading" ? (
              <span
                aria-hidden="true"
                className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent-strong)] motion-reduce:animate-none"
              />
            ) : null}
            {documentImportMessage.text}
          </p>
        ) : null}

        {editor && canEditNow && isPlan ? (
          <PlannerBar editor={editor} documentId={documentId} />
        ) : null}

        <div
          className="print-document-panel app-panel relative mx-auto flex w-full max-w-none flex-1 flex-col overflow-hidden rounded-sm"
          aria-busy={documentImportMessage?.kind === "loading"}
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
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {editor ? (
              <DocumentOutline
                editor={editor}
                canEdit={canEditNow}
                expanded={documentOutlineOpen}
                onToggle={toggleDocumentOutline}
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
