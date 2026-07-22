import Link from "next/link";
import type { ReactNode } from "react";

import { Brand } from "@/components/Brand";

export function LegalDocument({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand href="/" />
        <nav aria-label="Legal pages" className="flex items-center gap-4 text-sm">
          <Link className="text-link" href="/terms">
            Terms
          </Link>
          <Link className="text-link" href="/privacy">
            Privacy
          </Link>
        </nav>
      </header>

      <article className="legal-document mx-auto w-full max-w-3xl py-12 sm:py-16">
        <div className="mb-12 border-b border-[var(--border)] pb-10">
          <p className="page-kicker mb-4">Effective 22 July 2026</p>
          <h1 className="page-title">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
            {description}
          </p>
        </div>
        {children}
      </article>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] py-6 text-xs text-[var(--muted)]">
        <span>© 2026 Thido</span>
        <span>Think clearly. Draft confidently.</span>
      </footer>
    </main>
  );
}
