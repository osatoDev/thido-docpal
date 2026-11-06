import Link from "next/link";

import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HOW_IT_WORKS_STEPS } from "@/lib/howItWorks";

const VALUE_PROPS = [
  {
    title: "Type it the way you'd say it",
    body: "“Dentist next Tuesday 3pm” or “Pay rent on the 1st”. Thido finds the day, adds the time, and puts the task in order.",
  },
  {
    title: "One page, day by day",
    body: "Tasks are checklists under date headers. Add a day with /day or the calendar button, and move between days by year, month and week.",
  },
  {
    title: "Feedback when you want it",
    body: "Review my day gives two to four sentences on a day's plan. Thido can also check in a few times a day after you add tasks. Set how often in Settings, or turn it off.",
  },
] as const;

const PREVIEW_DAYS = [
  {
    date: "2026-11-10",
    label: "Nov 10 Tue",
    tasks: [
      { text: "08:30 Gym", done: true },
      { text: "15:00 Dentist", done: false },
      { text: "Pick up dry cleaning", done: false },
    ],
  },
  {
    date: "2026-11-11",
    label: "Nov 11 Wed",
    tasks: [
      { text: "09:30 Team standup", done: false },
      { text: "18:00 Dinner with Ana", done: false },
    ],
  },
] as const;

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border ${
        checked
          ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-[var(--background)]"
          : "border-[var(--border-strong)]"
      }`}
    >
      {checked ? (
        <svg
          viewBox="0 0 16 16"
          className="size-3 fill-none stroke-current"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 8.5 2.5 2.5L12 5.5" />
        </svg>
      ) : null}
    </span>
  );
}

function PlannerPreview() {
  return (
    <div
      aria-hidden="true"
      className="app-panel overflow-hidden rounded-xl shadow-sm"
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[var(--border-strong)]" />
        <span className="size-2.5 rounded-full bg-[var(--border-strong)]" />
        <span className="size-2.5 rounded-full bg-[var(--border-strong)]" />
        <span className="ml-3 text-xs text-[var(--muted-soft)]">My plan</span>
      </div>
      <div className="p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <div className="app-input min-w-0 flex-1 truncate rounded-md px-3 py-2 text-sm text-[var(--muted-soft)]">
            Dinner with Ana Wednesday 6pm
          </div>
          <span className="primary-button shrink-0 rounded-md px-3 py-2 text-sm font-semibold">
            Add
          </span>
        </div>

        <div className="mt-2 border-l-2 border-[var(--accent-strong)] px-3 py-2 text-sm leading-6">
          <p className="text-xs font-medium text-[var(--muted)]">
            Thido&rsquo;s take on Nov 10 Tue
          </p>
          <p className="mt-1 text-[var(--foreground)]">
            A light day. If the dentist runs long, the dry cleaning can move to
            Wednesday morning.
          </p>
        </div>

        {PREVIEW_DAYS.map((day) => (
          <div key={day.date} className="mt-5">
            <p className="font-serif text-sm text-[var(--muted)] italic">
              <time dateTime={day.date} className="font-medium">
                {day.label}
              </time>
            </p>
            <ul className="mt-2 space-y-2">
              {day.tasks.map((task) => (
                <li key={task.text} className="flex items-start gap-2.5 text-sm">
                  <Checkbox checked={task.done} />
                  <span
                    className={
                      task.done
                        ? "text-[var(--muted)] line-through"
                        : "text-[var(--foreground)]"
                    }
                  >
                    {task.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
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
            href="/register"
            className="primary-button rounded-md px-3.5 py-2 text-sm font-semibold"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
        <div>
          <p className="page-kicker mb-3">AI day planner</p>
          <h1 className="page-title max-w-xl">
            Plan your days in plain language.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
            Type &ldquo;Dentist next Tuesday 3pm&rdquo; and Thido puts it under
            Tuesday at 15:00, in order with the rest of that day. Ask for a
            short review of any day&rsquo;s plan, or let Thido check in a few
            times a day.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="primary-button rounded-md px-5 py-2.5 text-sm font-semibold"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="secondary-button rounded-md px-5 py-2.5 text-sm font-semibold"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-3 text-xs text-[var(--muted-soft)]">
            No card required. Free while Thido is in beta.
          </p>
        </div>
        <PlannerPreview />
      </section>

      <section className="border-t border-[var(--border-strong)] py-14">
        <p className="mx-auto max-w-2xl text-center font-serif text-2xl leading-snug font-medium tracking-[-0.02em] sm:text-3xl">
          A plan only helps if it is quick to keep up.
          <span className="mt-1 block text-[var(--muted)]">
            Thido takes a task in one line and puts it where it belongs, so the
            page stays current without the busywork.
          </span>
        </p>
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

      <section
        className="border-t border-[var(--border-strong)] py-14"
        aria-labelledby="coming-soon-heading"
      >
        <p className="page-kicker mb-3">Coming soon</p>
        <h2
          id="coming-soon-heading"
          className="max-w-2xl font-serif text-2xl font-medium tracking-[-0.02em]"
        >
          Telegram, Google Calendar and Microsoft Outlook
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
          Thido will connect to the apps you already use, so tasks and events
          from each one land on the right day.
        </p>
      </section>

      <section className="border-t border-[var(--border-strong)] py-16 text-center">
        <h2 className="page-title mx-auto max-w-2xl text-[clamp(1.9rem,4.5vw,2.75rem)]">
          Add your first task.
        </h2>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="primary-button rounded-md px-5 py-2.5 text-sm font-semibold"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="secondary-button rounded-md px-5 py-2.5 text-sm font-semibold"
          >
            Sign in
          </Link>
        </div>
      </section>

      <footer className="flex justify-end border-t border-[var(--border)] py-8 text-xs text-[var(--muted)]">
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
          <Link href="/login" className="text-link">
            Sign in
          </Link>
        </nav>
      </footer>
    </main>
  );
}
