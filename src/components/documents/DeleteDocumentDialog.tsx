"use client";

import { useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-[var(--danger)] px-4 py-2.5 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-65"
    >
      {pending ? "Deleting…" : "Delete document"}
    </button>
  );
}

export function DeleteDocumentDialog({
  documentId,
  documentTitle,
  deleteAction,
  onDeleted,
}: {
  documentId: string;
  documentTitle: string;
  deleteAction: (documentId: string) => Promise<boolean>;
  onDeleted?: (documentId: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const router = useRouter();

  async function handleDelete() {
    const deleted = await deleteAction(documentId);
    if (deleted) onDeleted?.(documentId);
    dialogRef.current?.close();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-soft)] transition hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] hover:text-[var(--danger)]"
        aria-label={`Delete ${documentTitle}`}
        title={`Delete ${documentTitle}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4.75A1.75 1.75 0 0 1 9.75 3h4.5A1.75 1.75 0 0 1 16 4.75V6" />
          <path d="M6.75 6l.8 11.15A2 2 0 0 0 9.54 19h4.92a2 2 0 0 0 1.99-1.85L17.25 6" />
          <path d="M10 10.25v5.5" />
          <path d="M14 10.25v5.5" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-6 sm:p-7">
          <p className="page-kicker mb-3">Confirm deletion</p>
          <h2
            id={titleId}
            className="font-serif text-2xl font-medium tracking-[-0.025em]"
          >
            Delete “{documentTitle}”?
          </h2>
          <p
            id={descriptionId}
            className="mt-3 text-sm leading-6 text-[var(--muted)]"
          >
            This permanently removes the document and its version history.
            This action cannot be undone.
          </p>

          <form
            action={handleDelete}
            className="mt-7 flex flex-wrap justify-end gap-3"
          >
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="secondary-button rounded-md px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
            <DeleteSubmitButton />
          </form>
        </div>
      </dialog>
    </>
  );
}
