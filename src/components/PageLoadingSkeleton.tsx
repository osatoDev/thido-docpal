type PageLoadingSkeletonProps = {
  label?: string;
  variant?: "document" | "page" | "spreadsheet";
};

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-[var(--surface-subtle)] motion-reduce:animate-none ${className}`}
    />
  );
}

export function PageLoadingSkeleton({
  label = "Loading page…",
  variant = "page",
}: PageLoadingSkeletonProps) {
  return (
    <main
      className="flex min-h-[70vh] w-full flex-1 flex-col px-5 py-6 sm:px-6 sm:py-10 lg:px-8"
      aria-busy="true"
      aria-label={label}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {label}
      </p>

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-8">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="size-5 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent-strong)] motion-reduce:animate-none"
            />
            <SkeletonBlock className="h-6 w-24" />
          </div>
          <SkeletonBlock className="h-9 w-28" />
        </div>

        {variant === "document" ? (
          <>
            <div className="flex gap-3">
              <SkeletonBlock className="h-9 w-32" />
              <SkeletonBlock className="h-9 flex-1" />
              <SkeletonBlock className="h-9 w-24" />
            </div>
            <SkeletonBlock className="min-h-[58vh] w-full rounded-xl" />
          </>
        ) : variant === "spreadsheet" ? (
          <>
            <div className="grid grid-cols-4 gap-2">
              <SkeletonBlock className="col-span-2 h-10" />
              <SkeletonBlock className="h-10" />
              <SkeletonBlock className="h-10" />
            </div>
            <div className="grid min-h-[55vh] grid-cols-6 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)]">
              {Array.from({ length: 36 }, (_, index) => (
                <SkeletonBlock key={index} className="min-h-16 rounded-none" />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-10 w-full max-w-xl" />
              <SkeletonBlock className="h-5 w-full max-w-2xl" />
            </div>
            <div className="grid flex-1 gap-5 md:grid-cols-3">
              <SkeletonBlock className="min-h-44" />
              <SkeletonBlock className="min-h-44" />
              <SkeletonBlock className="min-h-44" />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
