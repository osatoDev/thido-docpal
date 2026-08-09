export default function DocumentLoading() {
  return (
    <main
      className="flex min-h-0 flex-1 flex-col gap-4 px-2 py-3 sm:px-3 lg:px-4"
      aria-busy="true"
    >
      <p className="sr-only" role="status">
        Opening document…
      </p>
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="h-7 w-20 animate-pulse rounded bg-[var(--surface-subtle)]" />
        <div className="h-7 w-40 animate-pulse rounded bg-[var(--surface-subtle)]" />
      </div>
      <div className="mx-auto h-10 w-full max-w-none animate-pulse rounded bg-[var(--surface-subtle)]" />
      <div className="app-panel mx-auto min-h-[60vh] w-full max-w-none animate-pulse rounded-sm" />
    </main>
  );
}
