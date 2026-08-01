import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/account/UserMenu";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getVercelAnalyticsSummary } from "@/lib/vercelAnalytics";
import { getAiOperationsSummary } from "@/lib/ai/adminMetrics";
import { founderFeedbackRecipients } from "@/lib/feedback";

export const metadata: Metadata = {
  title: "Admin — Thido",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPercent(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("en", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
}

function formatDuration(milliseconds: number | null) {
  if (milliseconds === null) return "—";
  return milliseconds < 1_000
    ? `${milliseconds} ms`
    : `${(milliseconds / 1_000).toFixed(1)} s`;
}

function formatCost(microUsd: bigint) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(microUsd) / 1_000_000);
}

export default async function AdminPage() {
  const session = await requireAdmin();

  const [
    users,
    betaUsers,
    documents,
    comments,
    pendingSuggestions,
    awaitingFounderReplies,
    recentDocuments,
    analytics,
    aiOperations,
  ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { betaSeat: { not: null } } }),
      prisma.document.count({ where: { isPlaceholder: false } }),
      prisma.comment.count(),
      prisma.suggestion.count({ where: { status: "PENDING" } }),
      prisma.feedbackThread.count({ where: { responseDueAt: { not: null } } }),
      prisma.document.findMany({
        where: { isPlaceholder: false },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          owner: { select: { email: true } },
        },
      }),
      getVercelAnalyticsSummary(),
      getAiOperationsSummary(),
  ]);

  const metrics = [
    { label: "Users", value: users },
    { label: "Free beta seats", value: `${betaUsers} / 100` },
    { label: "Documents", value: documents },
    { label: "Comments", value: comments },
    { label: "Pending suggestions", value: pendingSuggestions },
    { label: "Founder replies due", value: awaitingFounderReplies },
  ];

  const configuration = [
    { label: "Database", ready: Boolean(process.env.DATABASE_URL) },
    { label: "Authentication", ready: Boolean(process.env.AUTH_SECRET) },
    { label: "Google OAuth", ready: Boolean(process.env.GOOGLE_CLIENT_ID) },
    { label: "Anthropic", ready: Boolean(process.env.ANTHROPIC_API_KEY) },
    {
      label: "Founder feedback email",
      ready: founderFeedbackRecipients().length > 0,
    },
    {
      label: "Stripe payments",
      ready: Boolean(
        process.env.STRIPE_SECRET_KEY &&
          process.env.STRIPE_PRO_PRICE_ID &&
          process.env.STRIPE_WEBHOOK_SECRET,
      ),
    },
    {
      label: "Vercel Analytics API",
      ready: Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID),
    },
  ];

  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-8 px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand href="/admin" />
        <nav className="flex items-center gap-4 text-sm text-[var(--muted)]" aria-label="Admin navigation">
          <Link href="/dashboard" className="hover:text-[var(--foreground)]">
            Documents
          </Link>
          <Link
            href="/admin/feedback"
            className="hover:text-[var(--foreground)]"
          >
            Feedback
          </Link>
          <UserMenu user={session.user} />
        </nav>
      </header>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
            Operations
          </p>
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[0.6rem] text-[var(--muted)]">
            {environment}
          </span>
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[0.6rem] text-[var(--muted)]">
            {commit}
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Admin console</h1>
        <p className="text-sm text-[var(--muted)]">
          Signed in as {session.user.email}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" aria-label="Application totals">
        {metrics.map((metric) => (
          <article key={metric.label} className="app-panel rounded-2xl p-5">
            <p className="text-sm font-medium text-[var(--muted)]">{metric.label}</p>
            <p className="mt-3 font-mono text-3xl font-semibold tracking-[-0.05em]">
              {metric.value.toLocaleString()}
            </p>
          </article>
        ))}
      </section>

      <section className="app-panel overflow-hidden rounded-2xl" aria-labelledby="ai-operations-heading">
        <div className="border-b border-[var(--border)] p-5 sm:p-7">
          <p className="page-kicker">AI operations</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="ai-operations-heading" className="font-serif text-2xl">
                Last seven days
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Durable Anthropic usage, feature outcomes, latency, and
                list-price estimates.
              </p>
            </div>
            <p className="font-mono text-xs text-[var(--muted)]">
              Since {formatDate(aiOperations.since)}
            </p>
          </div>
        </div>

        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Tracked calls",
              value: aiOperations.totalCalls.toLocaleString(),
            },
            {
              label: "Success rate",
              value: formatPercent(aiOperations.successRate),
            },
            {
              label: "Tokens",
              value: aiOperations.totalTokens.toLocaleString(),
            },
            {
              label: "Estimated cost",
              value: formatCost(aiOperations.estimatedCostMicroUsd),
            },
          ].map((metric) => (
            <div key={metric.label} className="bg-[var(--surface)] p-5 sm:px-7">
              <p className="text-xs font-medium text-[var(--muted)]">
                {metric.label}
              </p>
              <p className="mt-2 font-mono text-2xl tracking-[-0.04em]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {aiOperations.unpricedCalls > 0 && (
          <p className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--warm)] sm:px-7">
            {aiOperations.unpricedCalls} completed{" "}
            {aiOperations.unpricedCalls === 1 ? "call has" : "calls have"} no
            matching price version and is excluded from estimated cost.
          </p>
        )}

        <div className="overflow-x-auto border-t border-[var(--border)]">
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead className="bg-[var(--surface-subtle)] text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-7">Feature</th>
                <th className="px-5 py-3 font-medium">Calls</th>
                <th className="px-5 py-3 font-medium">Success</th>
                <th className="px-5 py-3 font-medium">p50 / p95</th>
                <th className="px-5 py-3 font-medium">First token</th>
                <th className="px-5 py-3 font-medium">Tokens</th>
                <th className="px-5 py-3 font-medium">Est. cost</th>
                <th className="px-5 py-3 font-medium sm:px-7">Top failure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {aiOperations.features.map((feature) => (
                <tr key={feature.feature}>
                  <td className="px-5 py-4 font-medium sm:px-7">
                    {feature.label}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">
                    {feature.calls}
                    {feature.pending > 0 && (
                      <span className="ml-1 text-[var(--warm)]">
                        ({feature.pending} pending)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">
                    {formatPercent(feature.successRate)}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--muted)]">
                    {formatDuration(feature.p50LatencyMs)} /{" "}
                    {formatDuration(feature.p95LatencyMs)}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--muted)]">
                    {formatDuration(feature.p50FirstTokenMs)}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">
                    {feature.totalTokens.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">
                    {formatCost(feature.estimatedCostMicroUsd)}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--muted)] sm:px-7">
                    {feature.topFailure ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {aiOperations.recentFailures.length > 0 && (
          <div className="border-t border-[var(--border)] p-5 sm:p-7">
            <h3 className="text-sm font-semibold">Recent AI failures</h3>
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {aiOperations.recentFailures.map((failure) => (
                <li key={failure.id} className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[12rem_1fr_auto] sm:gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      {failure.featureLabel}
                    </p>
                    <time
                      dateTime={failure.startedAt.toISOString()}
                      className="font-mono text-[0.65rem] text-[var(--muted)]"
                    >
                      {formatDate(failure.startedAt)}
                    </time>
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-[var(--danger)]">
                      {failure.errorCode}
                    </p>
                    {failure.errorMessage && (
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">
                        {failure.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="font-mono text-[0.65rem] text-[var(--muted-soft)] sm:text-right">
                    <p>{failure.model}</p>
                    {failure.providerRequestId && (
                      <p className="mt-1">{failure.providerRequestId}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="border-y border-[var(--border)] py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="page-kicker">Audience</p>
            <h2 className="mt-1 font-serif text-2xl">Last seven days</h2>
          </div>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-link text-sm text-[var(--muted)]"
          >
            Open Vercel Analytics ↗
          </a>
        </div>

        {analytics.status === "ready" ? (
          <div className="mt-6 grid gap-8 lg:grid-cols-[12rem_12rem_1fr]">
            <div>
              <p className="text-sm text-[var(--muted)]">Page views</p>
              <p className="mt-1 font-mono text-3xl">{analytics.pageviews.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Visitors</p>
              <p className="mt-1 font-mono text-3xl">{analytics.visitors.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Top routes</p>
              {analytics.routes.length ? (
                <ol className="mt-2 divide-y divide-[var(--border)]">
                  {analytics.routes.map((route) => (
                    <li key={route.route} className="flex items-center justify-between gap-4 py-2 text-sm">
                      <span className="truncate font-mono text-xs">{route.route}</span>
                      <span className="shrink-0 text-[var(--muted)]">
                        {route.pageviews.toLocaleString()} views
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-[var(--muted)]">No route data yet.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {analytics.status === "unconfigured"
              ? "Page tracking is enabled. Add VERCEL_TOKEN and VERCEL_PROJECT_ID to show traffic data here. Team projects also need VERCEL_TEAM_ID."
              : "Analytics data could not be loaded. Check the Vercel token scope and project identifiers."}
          </p>
        )}
      </section>

      <section className="app-panel rounded-2xl p-5 sm:p-7">
        <p className="font-mono text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
          System health
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Configuration</h2>
        <ul className="mt-5 flex flex-col divide-y divide-[var(--border)]">
          {configuration.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span className="text-sm">{item.label}</span>
              <span
                className={`font-mono text-[0.65rem] font-semibold ${
                  item.ready ? "text-[var(--accent-strong)]" : "text-[var(--danger)]"
                }`}
              >
                {item.ready ? "Ready" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="app-panel overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] p-5 sm:p-7">
          <div>
            <p className="font-mono text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
              Activity
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Recent documents</h2>
          </div>
          <a
            href="https://console.neon.tech/app/projects"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Open Neon console ↗
          </a>
        </div>

        {recentDocuments.length === 0 ? (
          <p className="p-7 text-sm text-[var(--muted)]">No documents have been created.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium sm:px-7">Document</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium sm:px-7">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentDocuments.map((document) => (
                  <tr key={document.id}>
                    <td className="px-5 py-4 font-medium sm:px-7">
                      {document.title}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {document.owner.email ?? "No email"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 font-mono text-[0.6rem] font-semibold tracking-wide text-[var(--muted)]">
                        {document.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-[var(--muted)] sm:px-7">
                      {formatDate(document.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
