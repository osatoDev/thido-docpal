export default function DocumentLoading() {
  return (
    <main
      className="flex min-h-0 flex-1 flex-col gap-6 px-4 py-5 sm:px-7 sm:py-6 lg:px-10"
      aria-busy="true"
    >
      <p className="sr-only" role="status">
        Opening document…
      </p>
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="h-7 w-20 animate-pulse rounded bg-[var(--surface-subtle)]" />
        <div className="h-7 w-40 animate-pulse rounded bg-[var(--surface-subtle)]" />
      </div>
      <div className="mx-auto h-10 w-full max-w-4xl animate-pulse rounded bg-[var(--surface-subtle)]" />
      <div className="app-panel mx-auto min-h-[60vh] w-full max-w-4xl animate-pulse rounded-sm" />
    </main>
  );
}
