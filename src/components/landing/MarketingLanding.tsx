import Link from "next/link";

import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

const KEY_FEATURES = [
  {
    title: "Days and projects on one page",
    body: "Every day is a checklist under its date, and every project keeps a list of its own. Jump to any of them from the outline, or move a task to another day in one click.",
  },
  {
    title: "Your day, in your inbox",
    body: "Every morning Thido emails today's plan and what you ticked off yesterday, so you start the day knowing what's on.",
  },
  {
    title: "A coach that reads the whole list",
    body: "The same email carries Thido's notes: a few points on today and yesterday, and ideas for the days ahead, drawn from everything on your list.",
  },
] as const;

const PREVIEW_DAYS = [
  {
    date: "2026-11-10",
    label: "Nov 10 Tue",
    tasks: [
      { text: "07:00 Morning run", done: true },
      { text: "08:30 Gym", done: true },
      { text: "09:30 Team standup", done: true },
      { text: "11:00 Review Q4 budget", done: false },
      { text: "13:00 Lunch with Sam", done: false },
      { text: "15:00 Dentist", done: false },
      { text: "Pick up dry cleaning", done: false },
    ],
  },
  {
    date: "2026-11-11",
    label: "Nov 11 Wed",
    tasks: [
      { text: "08:00 School drop-off", done: false },
      { text: "09:30 Team standup", done: false },
      { text: "10:30 Call the landlord", done: false },
      { text: "14:00 Design review", done: false },
      { text: "16:30 Groceries", done: false },
      { text: "18:00 Dinner with Ana", done: false },
    ],
  },
] as const;

const PREVIEW_PROJECT = {
  name: "Home move",
  tasks: [
    { text: "Give notice on the flat", done: true },
    { text: "Order boxes", done: false },
    { text: "Book movers", done: false },
  ],
} as const;

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
        {PREVIEW_DAYS.map((day, index) => (
          <div key={day.date} className={index === 0 ? "" : "mt-5"}>
            <p className="font-display text-base font-semibold text-[var(--foreground)]">
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

        <div className="mt-6">
          <p className="flex items-center gap-2 font-display text-base font-semibold text-[var(--foreground)]">
            <span className="rounded-full bg-[var(--accent-tint)] px-2 py-0.5 font-sans text-[0.65rem] font-semibold tracking-wide text-[var(--accent-strong)] uppercase">
              Project
            </span>
            {PREVIEW_PROJECT.name}
          </p>
          <ul className="mt-2 space-y-2">
            {PREVIEW_PROJECT.tasks.map((task) => (
              <li key={task.text} className="flex items-start gap-2.5 text-sm">
                <Checkbox checked={task.done} />
                <span className={task.done ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"}>
                  {task.text}
                </span>
              </li>
            ))}
          </ul>
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
            href="/register"
            className="primary-button rounded-md px-3.5 py-2 text-sm font-semibold"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
        <div>
          <p className="page-kicker mb-3">Day planner</p>
          <h1 className="page-title max-w-xl">
            Organize your life with Thido
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
            Your days as checklists, your projects as lists of their own, all
            on one page. Each morning, Thido emails you the day&rsquo;s plan
            with notes on what to do next.
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
        <p className="mx-auto max-w-2xl text-center font-display text-2xl leading-snug font-medium tracking-[-0.02em] sm:text-3xl">
          A plan only helps if you look at it.
          <span className="mt-1 block text-[var(--muted)]">
            Thido brings yours to your inbox every morning.
          </span>
        </p>
      </section>

      <section
        className="border-t border-[var(--border-strong)] py-14"
        aria-labelledby="features-heading"
      >
        <p id="features-heading" className="page-kicker mb-8">
          Key features
        </p>
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-10">
          {KEY_FEATURES.map((feature) => (
            <div key={feature.title}>
              <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="border-t border-[var(--border-strong)] py-14"
        aria-labelledby="coming-soon-heading"
      >
        <p className="page-kicker mb-3">Coming soon</p>
        <h2
          id="coming-soon-heading"
          className="max-w-2xl font-display text-2xl font-medium tracking-[-0.02em]"
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
          What&rsquo;s on tomorrow?
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
