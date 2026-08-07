"use client";

import { useEffect, useId, useRef, useState } from "react";

export function DocumentDownloadActions({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={menuId}
        className="secondary-button inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium"
      >
        Download
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-3 fill-none stroke-current"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 8 4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          className="app-panel absolute top-full left-0 z-30 mt-2 w-56 rounded-md p-2 text-xs"
        >
          <a
            href={`/api/documents/${documentId}/export/docx`}
            className="block rounded-sm px-3 py-2 hover:bg-[var(--surface-subtle)]"
            onClick={() => setOpen(false)}
          >
            Word document (.docx)
          </a>
          <a
            href={`/api/documents/${documentId}/export/pdf`}
            className="block rounded-sm px-3 py-2 hover:bg-[var(--surface-subtle)]"
            onClick={() => setOpen(false)}
          >
            PDF document (.pdf)
          </a>
        </div>
      ) : null}
    </div>
  );
}
