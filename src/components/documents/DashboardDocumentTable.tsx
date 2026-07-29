"use client";

import { useState } from "react";
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

type DashboardSort = {
  direction: SortDirection;
  key: SortKey;
};

export type DashboardDocumentRow = {
  id: string;
  title: string;
  href: string;
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

      if (comparison !== 0) {
        return comparison * direction;
      }
    } else {
      const comparison =
        Date.parse(left.lastAccessedAt) - Date.parse(right.lastAccessedAt);

      if (comparison !== 0) {
        return comparison * direction;
      }
    }

    return left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
    });
  });
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

export function DashboardDocumentTable({
  documents,
  deleteAction,
}: {
  documents: DashboardDocumentRow[];
  deleteAction: (documentId: string) => Promise<void>;
}) {
  const [sort, setSort] = useState<DashboardSort>({
    direction: "desc",
    key: "lastAccessedAt",
  });

  const sortedDocuments = sortDocuments(documents, sort);

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (current.key !== key) {
        return {
          direction: key === "title" ? "asc" : "desc",
          key,
        };
      }

      return {
        direction: current.direction === "asc" ? "desc" : "asc",
        key,
      };
    });
  }

  return (
    <div className="overflow-x-auto border-t border-[var(--border-strong)]">
      <table className="min-w-[38rem] w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <SortableHeader
              activeSort={sort}
              label="Title"
              sortKey="title"
              onSort={toggleSort}
            />
            <SortableHeader
              activeSort={sort}
              label="Last accessed"
              sortKey="lastAccessedAt"
              onSort={toggleSort}
            />
            <th
              scope="col"
              className="w-20 px-4 py-3 text-right text-xs font-medium text-[var(--muted)]"
            >
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedDocuments.map((document) => (
            <tr key={document.id} className="document-row border-b border-[var(--border)]">
              <td className="min-w-0 px-4 py-5 align-top">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <DocumentNavigationLink href={document.href}>
                      {document.title}
                    </DocumentNavigationLink>
                    {document.status !== "READY" && (
                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {document.status === "DRAFTING" ? "Drafting" : "Generating"}
                      </span>
                    )}
                  </div>
                  {!document.isOwner && (
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">
                      Shared by {document.ownerName || "the document owner"}
                    </p>
                  )}
                </div>
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
  );
}
