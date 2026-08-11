import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/account/UserMenu";
import { requireAdmin } from "@/lib/admin";
import { parseFounderInboxView } from "@/lib/feedback";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Founder inbox | Thido",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function FounderInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const view = parseFounderInboxView((await searchParams).view);
  const showingDue = view === "due";
  const session = await requireAdmin(
    showingDue ? "/admin/feedback?view=due" : "/admin/feedback",
  );
  const threads = await prisma.feedbackThread.findMany({
    where: showingDue ? { responseDueAt: { not: null } } : undefined,
    orderBy: showingDue
      ? [{ responseDueAt: "asc" }, { updatedAt: "desc" }]
      : { updatedAt: "desc" },
    select: {
      id: true,
      category: true,
      responseDueAt: true,
      updatedAt: true,
      user: { select: { name: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, authorType: true },
      },
    },
  });
  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-9 px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand href="/admin/feedback" />
        <nav className="flex items-center gap-4 text-sm text-[var(--muted)]">
          <Link href="/admin" className="hover:text-[var(--foreground)]">
            Operations
          </Link>
          <Link href="/dashboard" className="hover:text-[var(--foreground)]">
            Documents
          </Link>
          <UserMenu user={session.user} />
        </nav>
      </header>

      <section>
        <p className="page-kicker mb-3">Founder inbox</p>
        <h1 className="page-title">Messages from beta users.</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">
          {showingDue
            ? "Conversations awaiting a founder reply, ordered by deadline."
            : "Open a conversation to reply. Outstanding messages show their eight-hour response deadline."}
        </p>
        <nav
          className="mt-5 flex items-center gap-2"
          aria-label="Founder inbox views"
        >
          <Link
            href="/admin/feedback"
            aria-current={showingDue ? undefined : "page"}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              showingDue
                ? "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                : "border-[var(--accent-strong)] bg-[var(--surface-subtle)] text-[var(--foreground)]"
            }`}
          >
            All
          </Link>
          <Link
            href="/admin/feedback?view=due"
            aria-current={showingDue ? "page" : undefined}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              showingDue
                ? "border-[var(--accent-strong)] bg-[var(--surface-subtle)] text-[var(--foreground)]"
                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Replies due
          </Link>
        </nav>
      </section>

      <section className="app-panel overflow-hidden rounded-2xl">
        {threads.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted)]">
            {showingDue
              ? "No founder replies are currently due."
              : "No founder messages yet."}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {threads.map((thread) => {
              const latest = thread.messages[0];
              return (
                <li key={thread.id}>
                  <Link
                    href={`/admin/feedback/${thread.id}`}
                    className="grid gap-3 p-5 hover:bg-[var(--surface-subtle)] sm:grid-cols-[minmax(12rem,0.7fr)_minmax(0,1.3fr)_auto] sm:items-center sm:px-6"
                  >
                    <div>
                      <p className="font-semibold">
                        {thread.user.name || thread.user.email || "Thido user"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {thread.user.email}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
                        {thread.category.toLowerCase()}
                      </p>
                      <p className="mt-1 truncate text-sm">
                        {latest?.authorType === "FOUNDER" ? "You: " : ""}
                        {latest?.body ?? "No messages"}
                      </p>
                    </div>
                    <div className="text-xs sm:text-right">
                      {thread.responseDueAt ? (
                        <p className="text-[var(--warm)]">
                          Reply by {formatDate(thread.responseDueAt)}
                        </p>
                      ) : (
                        <p className="text-[var(--muted)]">Replied</p>
                      )}
                      <p className="mt-1 text-[var(--muted-soft)]">
                        Updated {formatDate(thread.updatedAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
