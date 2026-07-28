"use client";

import { useId, useRef } from "react";
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
}: {
  documentId: string;
  documentTitle: string;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  async function handleDelete(formData: FormData) {
    await deleteAction(formData);
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs text-[var(--muted-soft)] hover:text-[var(--danger)]"
      >
        Delete
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
            This permanently removes the document, its comments, and its
            drafting history. This action cannot be undone.
          </p>

          <form
            action={handleDelete}
            className="mt-7 flex flex-wrap justify-end gap-3"
          >
            <input type="hidden" name="id" value={documentId} />
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
