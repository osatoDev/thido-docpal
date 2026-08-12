"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function NewDocumentMenu({
  compact = false,
  placement = "below",
}: {
  compact?: boolean;
  placement?: "above" | "below";
}) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeWhenClickingElsewhere(event: PointerEvent) {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) {
        details.open = false;
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      const details = detailsRef.current;
      if (event.key !== "Escape" || !details?.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    }

    document.addEventListener("pointerdown", closeWhenClickingElsewhere);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenClickingElsewhere);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <details key={pathname} ref={detailsRef} className="group relative">
      <summary
        className={`primary-button inline-flex cursor-pointer list-none items-center gap-2 rounded-md font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] [&::-webkit-details-marker]:hidden ${
          compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
        }`}
        aria-label="Create a new document or spreadsheet"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-4 fill-none stroke-current"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M10 4v12M4 10h12" />
        </svg>
        <span>New document</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-3 fill-none stroke-current transition-transform group-open:rotate-180"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 8 4 4 4-4" />
        </svg>
      </summary>

      <div
        className={`absolute right-0 z-50 w-72 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1.5 text-left shadow-xl ${
          placement === "above" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
        aria-label="New document choices"
      >
        <form
          action="/api/new-document"
          method="post"
          target="_blank"
          onSubmit={() => {
            if (detailsRef.current) detailsRef.current.open = false;
          }}
        >
          <input type="hidden" name="kind" value="document" />
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2.5 text-left hover:bg-[var(--surface-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
          >
            <span className="block text-sm font-semibold">Blank document</span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              Open an empty Thido document.
            </span>
          </button>
        </form>
        <Link
          href="/documents/new"
          prefetch
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (detailsRef.current) detailsRef.current.open = false;
          }}
          className="block rounded-md px-3 py-2.5 hover:bg-[var(--surface-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
        >
          <span className="block text-sm font-semibold">Draft with AI</span>
          <span className="mt-0.5 block text-xs text-[var(--muted)]">
            Start from a prompt or guided brief.
          </span>
        </Link>
        <form
          action="/api/new-document"
          method="post"
          target="_blank"
          onSubmit={() => {
            if (detailsRef.current) detailsRef.current.open = false;
          }}
        >
          <input type="hidden" name="kind" value="spreadsheet" />
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2.5 text-left hover:bg-[var(--surface-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
          >
            <span className="block text-sm font-semibold">Spreadsheet</span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              Open an empty spreadsheet grid.
            </span>
          </button>
        </form>
      </div>
    </details>
  );
}
