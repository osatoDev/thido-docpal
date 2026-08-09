"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FounderFeedbackLauncher() {
  const pathname = usePathname();
  if (pathname === "/feedback") return null;

  return (
    <Link
      href={`/feedback?from=${encodeURIComponent(pathname)}`}
      className="fixed bottom-5 left-5 z-50 inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-raised)_92%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--muted)] shadow-sm backdrop-blur-md hover:border-[var(--accent-strong)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      aria-label="Want a feature? Suggest it here"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M5 5.5h14v10H9l-4 3v-13Z" strokeLinejoin="round" />
        <path d="M8 9h8M8 12h5" strokeLinecap="round" />
      </svg>
      Want a feature? Suggest it here
    </Link>
  );
}
