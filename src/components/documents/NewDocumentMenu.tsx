export function NewDocumentMenu({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/api/new-document" method="post" target="_blank">
      <input type="hidden" name="kind" value="document" />
      <button
        type="submit"
        className={`primary-button inline-flex items-center gap-2 rounded-md font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${
          compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
        }`}
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
      </button>
    </form>
  );
}
