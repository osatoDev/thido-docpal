import Link from "next/link";

import { Brand } from "@/components/Brand";
import { HowItWorksControl } from "@/components/HowItWorksControl";
import { UserMenu, type UserMenuProfile } from "@/components/account/UserMenu";
import { InitialPromptForm } from "@/components/wizard/InitialPromptForm";
import { HOW_IT_WORKS_STEPS } from "@/lib/howItWorks";

const RESUME_LOGIN_HREF =
  "/login?callbackUrl=%2Fdocuments%2Fnew%3Fresume%3D1";

export function NewDocumentLanding({
  user,
  resumeGuestDraft,
}: {
  user: UserMenuProfile | null;
  resumeGuestDraft: boolean;
}) {
  const isAuthenticated = Boolean(user);

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand />
        {user ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <HowItWorksControl />
            <Link
              href="/dashboard"
              className="secondary-button rounded-md px-3.5 py-2 text-sm font-medium"
            >
              My documents
            </Link>
            <UserMenu user={user} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <HowItWorksControl />
            <Link
              href={RESUME_LOGIN_HREF}
              className="secondary-button rounded-md px-3.5 py-2 text-sm font-medium"
            >
              Sign in
            </Link>
          </div>
        )}
      </header>

      <section className="py-12 sm:py-14">
        <p className="page-kicker mb-3">AI document companion</p>
        <h1 className="page-title max-w-4xl">Start with what you know.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Turn rough thinking into a focused document you can edit, question,
          and make your own.
        </p>
      </section>

      <section aria-labelledby="document-details-heading">
        <div className="mb-8 max-w-2xl">
          <p className="page-kicker mb-3">Your brief</p>
          <h2
            id="document-details-heading"
            className="font-serif text-2xl font-medium tracking-[-0.02em] sm:text-3xl"
          >
            Give the draft a clear direction.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            A few useful details are enough. You can change everything later.
          </p>
        </div>
        <InitialPromptForm
          isAuthenticated={isAuthenticated}
          resumeGuestDraft={resumeGuestDraft}
        />
      </section>

      <section
        className="mt-20 border-y border-[var(--border-strong)] py-10"
        aria-labelledby="how-it-works-heading"
      >
        <p id="how-it-works-heading" className="page-kicker mb-7">
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

      <footer className="flex flex-col gap-4 py-8 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>From rough notes to a working draft.</p>
        <nav
          aria-label="Legal and account links"
          className="flex items-center gap-5"
        >
          <Link href="/privacy" className="text-link">
            Privacy
          </Link>
          <Link href="/terms" className="text-link">
            Terms
          </Link>
          {!isAuthenticated && (
            <Link href={RESUME_LOGIN_HREF} className="text-link">
              Sign in
            </Link>
          )}
        </nav>
      </footer>
    </main>
  );
}
