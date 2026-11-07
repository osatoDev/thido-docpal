import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/account/UserMenu";
import { aiCreditActionLabel } from "@/lib/aiCreditLabels";
import { auth } from "@/lib/auth";
import { getAiCreditHistory } from "@/lib/entitlements";

const PAGE_SIZE = 50;

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const timestampFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function UsageHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/billing/usage");
  }

  const { cursor: cursorParam } = await searchParams;
  const cursor = Array.isArray(cursorParam) ? cursorParam[0] : cursorParam;

  const { entries, nextCursor } = await getAiCreditHistory(session.user.id, {
    limit: PAGE_SIZE,
    cursor,
  });

  const months = groupByAllowanceMonth(entries);

  return (
    <main className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col gap-10 px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand />
        <nav
          className="flex items-center gap-4 text-sm text-[var(--muted)]"
          aria-label="Account navigation"
        >
          <Link href="/billing" className="hover:text-[var(--foreground)]">
            Plan and billing
          </Link>
          <Link href="/plan" className="hover:text-[var(--foreground)]">
            All documents
          </Link>
          <UserMenu user={session.user} />
        </nav>
      </header>

      <div>
        <p className="page-kicker mb-3">Plan and billing</p>
        <h1 className="page-title">AI usage history</h1>
        <p className="mt-4 max-w-prose text-sm text-[var(--muted)]">
          Every AI action that used credits from your monthly allowance, newest
          first. Credits are weighted by action: planning follow-ups cost 1,
          generating a document or actioning a batch of comments costs 5, and
          the premium Opus model doubles each cost. Credits from a failed action
          are returned and shown here as refunded.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="app-panel rounded-xl p-4 text-sm text-[var(--muted)]">
          {cursor
            ? "No older AI usage to show."
            : "No AI actions on this account yet. Generate a document or ask Thido to action a comment to get started."}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {months.map((month) => (
            <section key={month.key} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
                <h2 className="font-semibold">{month.label}</h2>
                <p className="text-xs text-[var(--muted)]">
                  {month.totalCredits} credit
                  {month.totalCredits === 1 ? "" : "s"} used
                </p>
              </div>
              <ul className="flex flex-col">
                {month.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--border)] py-2.5 text-sm last:border-b-0"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">
                        {aiCreditActionLabel(entry.action)}
                        {entry.refunded && (
                          <span className="ml-2 rounded-sm bg-[var(--surface-subtle)] px-1.5 py-0.5 text-xs font-normal text-[var(--muted)]">
                            refunded
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {timestampFormatter.format(entry.createdAt)}
                        {" · "}
                        {entry.model}
                        {entry.documentTitle && (
                          <>
                            {" · "}
                            {entry.documentId ? (
                              <Link
                                href={`/documents/${entry.documentId}`}
                                className="underline underline-offset-2 hover:text-[var(--foreground)]"
                              >
                                {entry.documentTitle}
                              </Link>
                            ) : (
                              entry.documentTitle
                            )}
                          </>
                        )}
                      </span>
                    </div>
                    <span
                      className={`tabular-nums ${
                        entry.refunded
                          ? "text-[var(--muted)] line-through"
                          : "text-[var(--foreground)]"
                      }`}
                    >
                      {entry.credits} credit{entry.credits === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        {cursor ? (
          <Link
            href="/billing/usage"
            className="text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]"
          >
            Back to latest
          </Link>
        ) : (
          <span />
        )}
        {nextCursor && (
          <Link
            href={`/billing/usage?cursor=${nextCursor}`}
            className="secondary-button rounded-md px-3 py-2 text-sm font-semibold"
          >
            Older activity
          </Link>
        )}
      </div>
    </main>
  );
}

type HistoryEntry = Awaited<
  ReturnType<typeof getAiCreditHistory>
>["entries"][number];

function groupByAllowanceMonth(entries: HistoryEntry[]) {
  const groups = new Map<
    string,
    { key: string; label: string; totalCredits: number; entries: HistoryEntry[] }
  >();

  for (const entry of entries) {
    const key = `${entry.periodStart.getUTCFullYear()}-${entry.periodStart.getUTCMonth()}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: monthFormatter.format(entry.periodStart),
        totalCredits: 0,
        entries: [],
      };
      groups.set(key, group);
    }
    group.entries.push(entry);
    if (!entry.refunded) group.totalCredits += entry.credits;
  }

  return [...groups.values()];
}
