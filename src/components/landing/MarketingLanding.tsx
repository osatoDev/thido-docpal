import Link from "next/link";

import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HOW_IT_WORKS_STEPS } from "@/lib/howItWorks";
import { LANDING_STORIES } from "@/lib/landingStories";

const VALUE_PROPS = [
  {
    title: "Start from anything",
    body: "A blank page, a document you already have, or a short brief for Thido to shape into a first version.",
  },
  {
    title: "Edit like a normal document",
    body: "Headings, links, tables, checklists, footnotes, and export to Word or PDF. Nothing to learn.",
  },
  {
    title: "Think it through with Thido",
    body: "Ask questions, request changes on a passage, and keep the parts that are already right.",
  },
] as const;

function EditorPreview() {
  return (
    <div
      aria-hidden="true"
      className="app-panel overflow-hidden rounded-xl shadow-sm"
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[var(--border-strong)]" />
        <span className="size-2.5 rounded-full bg-[var(--border-strong)]" />
        <span className="size-2.5 rounded-full bg-[var(--border-strong)]" />
        <span className="ml-3 text-xs text-[var(--muted-soft)]">
          Investor update, March
        </span>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_14rem] sm:p-8">
        <div className="space-y-3">
          <div className="h-5 w-2/3 rounded bg-[var(--foreground)] opacity-80" />
          <div className="h-3 w-full rounded bg-[var(--surface-subtle)]" />
          <div className="h-3 w-11/12 rounded bg-[var(--surface-subtle)]" />
          <div className="h-3 w-full rounded bg-[var(--surface-subtle)]" />
          <div className="h-3 w-4/5 rounded bg-[var(--surface-subtle)]" />
          <div className="my-4 h-4 w-1/3 rounded bg-[var(--foreground)] opacity-60" />
          <div className="h-3 w-full rounded bg-[var(--surface-subtle)]" />
          <div className="h-3 w-full rounded bg-[color-mix(in_srgb,var(--warm)_28%,transparent)]" />
          <div className="h-3 w-3/4 rounded bg-[var(--surface-subtle)]" />
        </div>
        <div className="hidden space-y-3 border-l border-[var(--border)] pl-5 sm:block">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            Thido
          </p>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
            <div className="h-2.5 w-full rounded bg-[var(--surface-subtle)]" />
            <div className="mt-1.5 h-2.5 w-5/6 rounded bg-[var(--surface-subtle)]" />
            <div className="mt-3 h-6 w-24 rounded bg-[var(--accent-strong)] opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingLanding() {
  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="secondary-button rounded-md px-3.5 py-2 text-sm font-medium"
          >
            Sign in
          </Link>
          <Link
            href="/try"
            className="primary-button rounded-md px-3.5 py-2 text-sm font-semibold"
          >
            Try Thido
          </Link>
        </div>
      </header>

      <section className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
        <div>
          <p className="page-kicker mb-3">AI document companion</p>
          <h1 className="page-title max-w-xl">
            Think clearly. Draft confidently.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
            Thido turns rough thinking into a focused document you can edit,
            question, and make your own. Bring notes, a draft, or just an idea,
            and leave with something worth sending.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/try"
              className="primary-button rounded-md px-5 py-2.5 text-sm font-semibold"
            >
              Try Thido free
            </Link>
            <Link
              href="/register"
              className="secondary-button rounded-md px-5 py-2.5 text-sm font-semibold"
            >
              Create an account
            </Link>
          </div>
          <p className="mt-3 text-xs text-[var(--muted-soft)]">
            No card required. Free while Thido is in beta.
          </p>
        </div>
        <EditorPreview />
      </section>

      <section
        className="border-t border-[var(--border-strong)] py-14"
        aria-labelledby="value-heading"
      >
        <p id="value-heading" className="page-kicker mb-8">
          What Thido does
        </p>
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-10">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title}>
              <h2 className="font-serif text-xl font-medium tracking-[-0.02em]">
                {prop.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {prop.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="border-t border-[var(--border-strong)] py-14"
        aria-labelledby="stories-heading"
      >
        <p id="stories-heading" className="page-kicker mb-8">
          How people use Thido
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {LANDING_STORIES.map((story) => (
            <article
              key={story.persona}
              className="app-panel flex flex-col gap-3 rounded-xl p-5"
            >
              <h3 className="font-serif text-lg font-medium tracking-[-0.02em]">
                {story.persona}
              </h3>
              <p className="text-sm leading-6 text-[var(--muted)]">
                {story.situation} In Thido, they {story.withThido}
              </p>
              <p className="mt-auto border-t border-[var(--border)] pt-3 text-sm font-medium text-[var(--foreground)]">
                {story.outcome}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="border-t border-[var(--border-strong)] py-14"
        aria-labelledby="how-heading"
      >
        <p id="how-heading" className="page-kicker mb-8">
          How it works
        </p>
        <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <li
              key={step.number}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 sm:block"
            >
              <span className="font-mono text-xs text-[var(--accent-strong)]">
                {step.number}
              </span>
              <div className="sm:mt-5">
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-2 max-w-xs text-xs leading-5 text-[var(--muted)]">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-[var(--border-strong)] py-16 text-center">
        <h2 className="page-title mx-auto max-w-2xl text-[clamp(1.9rem,4.5vw,2.75rem)]">
          Start with what you know.
        </h2>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/try"
            className="primary-button rounded-md px-5 py-2.5 text-sm font-semibold"
          >
            Try Thido free
          </Link>
          <Link
            href="/register"
            className="secondary-button rounded-md px-5 py-2.5 text-sm font-semibold"
          >
            Create an account
          </Link>
        </div>
      </section>

      <footer className="flex flex-col gap-4 border-t border-[var(--border)] py-8 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>From rough notes to a working draft.</p>
        <nav aria-label="Legal and account links" className="flex items-center gap-5">
          <Link href="/privacy" className="text-link">
            Privacy
          </Link>
          <Link href="/terms" className="text-link">
            Terms
          </Link>
          <Link href="/login" className="text-link">
            Sign in
          </Link>
        </nav>
      </footer>
    </main>
  );
}
