import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { HowItWorksControl } from "@/components/HowItWorksControl";
import { UserMenu } from "@/components/account/UserMenu";
import {
  createBlankDocument,
  createDocumentForPaste,
} from "@/app/document-actions";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/documents/new");
  }

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand />
        <nav
          aria-label="Account navigation"
          className="flex items-center gap-4 text-sm text-[var(--muted)]"
        >
          <HowItWorksControl />
          <Link href="/dashboard" className="hover:text-[var(--foreground)]">
            My documents
          </Link>
          <UserMenu user={session.user} />
        </nav>
      </header>

      <section className="flex flex-1 flex-col justify-center py-14 sm:py-20">
        <div className="max-w-3xl">
          <p className="page-kicker mb-3">Welcome to Thido</p>
          <h1 className="page-title">How would you like to begin?</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Start with a blank page, ask AI to prepare a draft, or bring in a
            document you already have.
          </p>
        </div>

        <div className="mt-10 grid max-w-6xl gap-5 md:grid-cols-3">
          <form action={createBlankDocument}>
            <button
              type="submit"
              className="app-panel group flex min-h-64 w-full flex-col justify-between rounded-xl border-[var(--accent-strong)] p-7 text-left hover:bg-[var(--surface-raised)] sm:p-8"
            >
              <span className="font-mono text-xs text-[var(--accent-strong)]">
                01 · Default
              </span>
              <span className="mt-12">
                <span className="block font-serif text-2xl font-semibold tracking-[-0.025em]">
                  Blank document
                </span>
                <span className="mt-3 block max-w-md text-sm leading-6 text-[var(--muted)]">
                  Open an empty document and start writing immediately. AI stays
                  out of the way until you ask for it.
                </span>
                <span className="mt-6 block text-sm font-semibold text-[var(--accent-strong)]">
                  Start writing →
                </span>
              </span>
            </button>
          </form>

          <Link
            href="/documents/new"
            className="app-panel group flex min-h-64 flex-col justify-between rounded-xl p-7 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] sm:p-8"
          >
            <span className="font-mono text-xs text-[var(--warm)]">02</span>
            <span className="mt-12">
              <span className="block font-serif text-2xl font-semibold tracking-[-0.025em]">
                Draft with AI
              </span>
              <span className="mt-3 block max-w-md text-sm leading-6 text-[var(--muted)]">
                Share a few details or write a freeform brief, then let Thido
                prepare a first draft.
              </span>
              <span className="mt-6 block text-sm font-semibold text-[var(--warm)]">
                Start from a brief →
              </span>
            </span>
          </Link>

          <form action={createDocumentForPaste}>
            <button
              type="submit"
              className="app-panel group flex min-h-64 w-full flex-col justify-between rounded-xl p-7 text-left hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] sm:p-8"
            >
              <span className="font-mono text-xs text-[var(--muted)]">03</span>
              <span className="mt-12">
                <span className="block font-serif text-2xl font-semibold tracking-[-0.025em]">
                  Paste an existing document
                </span>
                <span className="mt-3 block max-w-md text-sm leading-6 text-[var(--muted)]">
                  Open a clean editor, paste in your draft, and ask Thido to
                  address feedback through comments.
                </span>
                <span className="mt-6 block text-sm font-semibold text-[var(--warm)]">
                  Open a blank editor →
                </span>
              </span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
