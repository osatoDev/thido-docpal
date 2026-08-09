"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { DeleteDocumentDialog } from "@/components/documents/DeleteDocumentDialog";
import { DocumentNavigationLink } from "@/components/documents/DocumentNavigationLink";

const lastAccessedFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type SortKey = "title" | "lastAccessedAt";
type SortDirection = "asc" | "desc";
type FolderSelection = "all" | "unfiled" | "shared" | `folder:${string}`;

type DashboardSort = {
  direction: SortDirection;
  key: SortKey;
};

type FolderResult =
  | { ok: false; error: string }
  | { ok: true; folder: { id: string; name: string } };

type BasicActionResult = { ok: true } | { ok: false; error: string };

export type DashboardFolderRow = {
  id: string;
  name: string;
};

export type DashboardDocumentRow = {
  id: string;
  title: string;
  href: string;
  folderId: string | null;
  lastAccessedAt: string;
  ownerName: string | null;
  isOwner: boolean;
  permission: "VIEW" | "COMMENT" | "EDIT" | "FULL";
  status: "DRAFTING" | "GENERATING" | "READY";
};

function sortDocuments(
  documents: DashboardDocumentRow[],
  sort: DashboardSort,
) {
  const direction = sort.direction === "asc" ? 1 : -1;

  return documents.toSorted((left, right) => {
    if (sort.key === "title") {
      const comparison = left.title.localeCompare(right.title, undefined, {
        sensitivity: "base",
      });

      if (comparison !== 0) return comparison * direction;
    } else {
      const comparison =
        Date.parse(left.lastAccessedAt) - Date.parse(right.lastAccessedAt);

      if (comparison !== 0) return comparison * direction;
    }

    return left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
    });
  });
}

function sortFolders(folders: DashboardFolderRow[]) {
  return folders.toSorted((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

function FolderIcon({ open = false }: { open?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {open ? (
        <>
          <path d="M3.5 8.5h17l-2 10h-13l-2-10Z" />
          <path d="M5 8.5V5.75A1.75 1.75 0 0 1 6.75 4h3l2 2h5.5A1.75 1.75 0 0 1 19 7.75v.75" />
        </>
      ) : (
        <path d="M3.5 6.25A1.75 1.75 0 0 1 5.25 4.5H10l2 2h6.75a1.75 1.75 0 0 1 1.75 1.75v9.5A1.75 1.75 0 0 1 18.75 19H5.25a1.75 1.75 0 0 1-1.75-1.75v-11Z" />
      )}
    </svg>
  );
}

function CollectionIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <path d="M5 6.5h14M5 12h14M5 17.5h14" />
    </svg>
  );
}

function SharedIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3.75 18.5c.35-3 2.1-4.5 5.25-4.5s4.9 1.5 5.25 4.5M15 6.25a2.5 2.5 0 0 1 0 4.9M16 14c2.5.2 3.85 1.7 4.1 4.1" />
    </svg>
  );
}

function SortableHeader({
  activeSort,
  label,
  sortKey,
  onSort,
}: {
  activeSort: DashboardSort;
  label: string;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeSort.key === sortKey;
  const ariaSort = !isActive
    ? "none"
    : activeSort.direction === "asc"
      ? "ascending"
      : "descending";
  const indicator = !isActive ? "↕" : activeSort.direction === "asc" ? "↑" : "↓";

  return (
    <th scope="col" aria-sort={ariaSort} className="px-4 py-3 text-left">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <span>{label}</span>
        <span aria-hidden="true" className="text-[0.7rem]">
          {indicator}
        </span>
      </button>
    </th>
  );
}

function DeleteFolderDialog({
  folder,
  pending,
  onCancel,
  onConfirm,
}: {
  folder: DashboardFolderRow | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (folder && !dialog.open) dialog.showModal();
    if (!folder && dialog.open) dialog.close();
  }, [folder]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6 sm:p-7">
        <p className="page-kicker mb-3">Delete folder</p>
        <h2 id={titleId} className="font-serif text-2xl font-medium tracking-[-0.025em]">
          Delete “{folder?.name}”?
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-[var(--muted)]">
          The folder will be removed. Its documents will stay safe and move to
          Unfiled.
        </p>
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="secondary-button rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="rounded-md bg-[var(--danger)] px-4 py-2.5 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-65"
          >
            {pending ? "Deleting…" : "Delete folder"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function libraryButtonClass(active: boolean) {
  return `flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition ${
    active
      ? "bg-[var(--surface-subtle)] font-medium text-[var(--foreground)]"
      : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
  }`;
}

export function DashboardDocumentTable({
  documents,
  folders,
  deleteAction,
  createFolderAction,
  renameFolderAction,
  deleteFolderAction,
  moveDocumentAction,
}: {
  documents: DashboardDocumentRow[];
  folders: DashboardFolderRow[];
  deleteAction: (documentId: string) => Promise<boolean>;
  createFolderAction: (name: string) => Promise<FolderResult>;
  renameFolderAction: (folderId: string, name: string) => Promise<FolderResult>;
  deleteFolderAction: (folderId: string) => Promise<BasicActionResult>;
  moveDocumentAction: (
    documentId: string,
    folderId: string | null,
  ) => Promise<BasicActionResult>;
}) {
  const [documentRows, setDocumentRows] = useState(documents);
  const [folderRows, setFolderRows] = useState(folders);
  const [selection, setSelection] = useState<FolderSelection>("all");
  const [sort, setSort] = useState<DashboardSort>({
    direction: "desc",
    key: "lastAccessedAt",
  });
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DashboardFolderRow | null>(null);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sharedCount = documentRows.filter((document) => !document.isOwner).length;
  const unfiledCount = documentRows.filter(
    (document) => document.isOwner && !document.folderId,
  ).length;
  const folderCounts = new Map<string, number>();
  for (const document of documentRows) {
    if (document.isOwner && document.folderId) {
      folderCounts.set(
        document.folderId,
        (folderCounts.get(document.folderId) ?? 0) + 1,
      );
    }
  }

  const selectedFolderId = selection.startsWith("folder:")
    ? selection.slice("folder:".length)
    : null;
  const selectedFolder = selectedFolderId
    ? folderRows.find((folder) => folder.id === selectedFolderId)
    : null;
  const selectionLabel =
    selection === "all"
      ? "All documents"
      : selection === "unfiled"
        ? "Unfiled"
        : selection === "shared"
          ? "Shared with me"
          : selectedFolder?.name ?? "Folder";

  const visibleDocuments = useMemo(() => {
    const filtered = documentRows.filter((document) => {
      if (selection === "all") return true;
      if (selection === "unfiled") return document.isOwner && !document.folderId;
      if (selection === "shared") return !document.isOwner;
      return document.isOwner && document.folderId === selectedFolderId;
    });
    return sortDocuments(filtered, sort);
  }, [documentRows, selectedFolderId, selection, sort]);

  function clearMessages() {
    setError(null);
    setNotice(null);
  }

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (current.key !== key) {
        return { direction: key === "title" ? "asc" : "desc", key };
      }
      return {
        direction: current.direction === "asc" ? "desc" : "asc",
        key,
      };
    });
  }

  function createFolder() {
    clearMessages();
    setPendingTarget("create-folder");
    startTransition(async () => {
      try {
        const result = await createFolderAction(newFolderName);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setFolderRows((current) => sortFolders([...current, result.folder]));
        setSelection(`folder:${result.folder.id}`);
        setNewFolderName("");
        setCreatingFolder(false);
        setNotice(`Created ${result.folder.name}.`);
      } finally {
        setPendingTarget(null);
      }
    });
  }

  function renameFolder(folderId: string) {
    clearMessages();
    setPendingTarget(`rename:${folderId}`);
    startTransition(async () => {
      try {
        const result = await renameFolderAction(folderId, editingFolderName);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setFolderRows((current) =>
          sortFolders(
            current.map((folder) =>
              folder.id === folderId ? result.folder : folder,
            ),
          ),
        );
        setEditingFolderId(null);
        setEditingFolderName("");
        setNotice(`Renamed folder to ${result.folder.name}.`);
      } finally {
        setPendingTarget(null);
      }
    });
  }

  function deleteFolder() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    clearMessages();
    setPendingTarget(`delete:${target.id}`);
    startTransition(async () => {
      try {
        const result = await deleteFolderAction(target.id);
        if (!result.ok) {
          setError(result.error);
          setDeleteTarget(null);
          return;
        }
        setFolderRows((current) => current.filter((folder) => folder.id !== target.id));
        setDocumentRows((current) =>
          current.map((document) =>
            document.folderId === target.id
              ? { ...document, folderId: null }
              : document,
          ),
        );
        if (selection === `folder:${target.id}`) setSelection("unfiled");
        setDeleteTarget(null);
        setNotice(`Deleted ${target.name}. Its documents are now Unfiled.`);
      } finally {
        setPendingTarget(null);
      }
    });
  }

  function moveDocument(documentId: string, folderId: string | null) {
    clearMessages();
    setPendingTarget(`move:${documentId}`);
    startTransition(async () => {
      try {
        const result = await moveDocumentAction(documentId, folderId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setDocumentRows((current) =>
          current.map((document) =>
            document.id === documentId ? { ...document, folderId } : document,
          ),
        );
        const destination = folderId
          ? folderRows.find((folder) => folder.id === folderId)?.name ?? "folder"
          : "Unfiled";
        setNotice(`Moved document to ${destination}.`);
      } finally {
        setPendingTarget(null);
      }
    });
  }

  return (
    <div className="grid overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="border-b border-[var(--border)] bg-[var(--surface-raised)] p-3 md:border-r md:border-b-0">
        <nav aria-label="Document folders" className="space-y-1">
          <button
            type="button"
            aria-current={selection === "all" ? "page" : undefined}
            onClick={() => setSelection("all")}
            className={libraryButtonClass(selection === "all")}
          >
            <CollectionIcon />
            <span className="min-w-0 flex-1 truncate">All documents</span>
            <span className="text-xs tabular-nums text-[var(--muted)]">
              {documentRows.length}
            </span>
          </button>
          <button
            type="button"
            aria-current={selection === "unfiled" ? "page" : undefined}
            onClick={() => setSelection("unfiled")}
            className={libraryButtonClass(selection === "unfiled")}
          >
            <FolderIcon open />
            <span className="min-w-0 flex-1 truncate">Unfiled</span>
            <span className="text-xs tabular-nums text-[var(--muted)]">
              {unfiledCount}
            </span>
          </button>
          {sharedCount > 0 ? (
            <button
              type="button"
              aria-current={selection === "shared" ? "page" : undefined}
              onClick={() => setSelection("shared")}
              className={libraryButtonClass(selection === "shared")}
            >
              <SharedIcon />
              <span className="min-w-0 flex-1 truncate">Shared with me</span>
              <span className="text-xs tabular-nums text-[var(--muted)]">
                {sharedCount}
              </span>
            </button>
          ) : null}
        </nav>

        <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] px-2.5 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Folders
          </h2>
          <button
            type="button"
            onClick={() => {
              clearMessages();
              setCreatingFolder(true);
            }}
            aria-label="Create folder"
            title="Create folder"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {creatingFolder ? (
          <form
            className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2"
            onSubmit={(event) => {
              event.preventDefault();
              createFolder();
            }}
          >
            <label htmlFor="new-folder-name" className="sr-only">
              Folder name
            </label>
            <input
              id="new-folder-name"
              autoFocus
              value={newFolderName}
              maxLength={80}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Folder name"
              className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreatingFolder(false);
                  setNewFolderName("");
                }}
                className="px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending && pendingTarget === "create-folder"}
                className="rounded-md bg-[var(--accent-strong)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] disabled:cursor-wait disabled:opacity-60"
              >
                {isPending && pendingTarget === "create-folder" ? "Adding…" : "Add"}
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-2 space-y-1">
          {folderRows.length === 0 && !creatingFolder ? (
            <p className="px-2.5 py-3 text-xs leading-5 text-[var(--muted)]">
              Create a folder to group related work.
            </p>
          ) : null}
          {folderRows.map((folder) => {
            const folderSelection: FolderSelection = `folder:${folder.id}`;
            const isActive = selection === folderSelection;
            const isEditing = editingFolderId === folder.id;

            if (isEditing) {
              return (
                <form
                  key={folder.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    renameFolder(folder.id);
                  }}
                >
                  <label htmlFor={`folder-name-${folder.id}`} className="sr-only">
                    Rename {folder.name}
                  </label>
                  <input
                    id={`folder-name-${folder.id}`}
                    autoFocus
                    value={editingFolderName}
                    maxLength={80}
                    onChange={(event) => setEditingFolderName(event.target.value)}
                    className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingFolderId(null)}
                      className="px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending && pendingTarget === `rename:${folder.id}`}
                      className="rounded-md bg-[var(--accent-strong)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] disabled:cursor-wait disabled:opacity-60"
                    >
                      {isPending && pendingTarget === `rename:${folder.id}` ? "Saving…" : "Save"}
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div key={folder.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setSelection(folderSelection)}
                  className={libraryButtonClass(isActive)}
                >
                  <FolderIcon />
                  <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                  <span className="text-xs tabular-nums text-[var(--muted)]">
                    {folderCounts.get(folder.id) ?? 0}
                  </span>
                </button>
                <div className={`flex items-center ${isActive ? "opacity-100" : "opacity-70 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"}`}>
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setEditingFolderId(folder.id);
                      setEditingFolderName(folder.name);
                    }}
                    aria-label={`Rename ${folder.name}`}
                    title={`Rename ${folder.name}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m14.5 5.5 4 4M4.5 19.5l3.6-.8L18 8.8a1.4 1.4 0 0 0 0-2l-.8-.8a1.4 1.4 0 0 0-2 0L5.3 15.9l-.8 3.6Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setDeleteTarget(folder);
                    }}
                    aria-label={`Delete ${folder.name}`}
                    title={`Delete ${folder.name}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] hover:text-[var(--danger)]"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 7h14M9 7V4.5h6V7M7.5 7l.7 12h7.6l.7-12M10 10.5v5M14 10.5v5" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {error ? (
          <p aria-live="polite" className="mt-3 px-2.5 text-xs leading-5 text-[var(--danger)]">
            {error}
          </p>
        ) : null}
      </aside>

      <div className="min-w-0">
        <div className="flex min-h-[4.5rem] flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <div>
            <p className="font-medium">{selectionLabel}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {visibleDocuments.length} {visibleDocuments.length === 1 ? "document" : "documents"}
            </p>
          </div>
          <div aria-live="polite" className="text-right text-xs">
            {notice ? <p className="text-[var(--muted)]">{notice}</p> : null}
          </div>
        </div>

        {visibleDocuments.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--muted)]">
              <FolderIcon open />
            </span>
            <p className="mt-4 font-medium">
              {selection === "all" ? "No documents yet" : "Nothing here yet"}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
              {selection === "all"
                ? "Create a document, then use its folder menu to keep related work together."
                : selection === "shared"
                  ? "Documents other people share with you will appear here."
                  : "Move a document here from the folder menu in All documents or Unfiled."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <SortableHeader activeSort={sort} label="Title" sortKey="title" onSort={toggleSort} />
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">
                    Folder
                  </th>
                  <SortableHeader activeSort={sort} label="Last accessed" sortKey="lastAccessedAt" onSort={toggleSort} />
                  <th scope="col" className="w-20 px-4 py-3 text-right text-xs font-medium text-[var(--muted)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleDocuments.map((document) => (
                  <tr key={document.id} className="document-row border-b border-[var(--border)] last:border-b-0">
                    <td className="min-w-0 px-4 py-5 align-top">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <DocumentNavigationLink href={document.href}>
                            {document.title}
                          </DocumentNavigationLink>
                          {document.status !== "READY" ? (
                            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                              {document.status === "DRAFTING" ? "Drafting" : "Generating"}
                            </span>
                          ) : null}
                        </div>
                        {!document.isOwner ? (
                          <p className="mt-1 truncate text-xs text-[var(--muted)]">
                            Shared by {document.ownerName || "the document owner"}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {document.isOwner ? (
                        <>
                          <label htmlFor={`document-folder-${document.id}`} className="sr-only">
                            Move {document.title} to folder
                          </label>
                          <select
                            id={`document-folder-${document.id}`}
                            value={document.folderId ?? ""}
                            disabled={isPending && pendingTarget === `move:${document.id}`}
                            onChange={(event) => moveDocument(document.id, event.target.value || null)}
                            className="max-w-44 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-2 text-xs text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-wait disabled:opacity-60"
                          >
                            <option value="">Unfiled</option>
                            {folderRows.map((folder) => (
                              <option key={folder.id} value={folder.id}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">Shared with me</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-5 align-top text-xs text-[var(--muted)]">
                      <time dateTime={document.lastAccessedAt}>
                        {lastAccessedFormatter.format(new Date(document.lastAccessedAt))}
                      </time>
                    </td>
                    <td className="px-4 py-5 align-top text-right">
                      {document.permission === "FULL" ? (
                        <DeleteDocumentDialog
                          documentId={document.id}
                          documentTitle={document.title}
                          deleteAction={deleteAction}
                          onDeleted={(documentId) =>
                            setDocumentRows((current) =>
                              current.filter((row) => row.id !== documentId),
                            )
                          }
                        />
                      ) : (
                        <span className="text-xs capitalize text-[var(--muted)]">
                          {document.permission.toLowerCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeleteFolderDialog
        folder={deleteTarget}
        pending={isPending && pendingTarget === `delete:${deleteTarget?.id}`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteFolder}
      />
    </div>
  );
}
