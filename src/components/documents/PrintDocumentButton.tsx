"use client";

export function PrintDocumentButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="secondary-button inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-medium"
      aria-label="Print document"
      title="Print document"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4 fill-none stroke-current"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 9V3h10v6" />
        <path d="M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M7 14h10v7H7z" />
        <path d="M17.5 12h.01" />
      </svg>
      Print
    </button>
  );
}
