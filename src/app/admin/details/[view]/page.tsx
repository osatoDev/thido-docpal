import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/account/UserMenu";
import { requireAdmin } from "@/lib/admin";
import {
  adminDetailHref,
  adminDetailViews,
  parseAdminDetailPage,
  parseAdminDetailView,
  type AdminDetailView,
} from "@/lib/adminDetails";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin details - Thido",
};

const PAGE_SIZE = 25;

const viewLabels: Record<AdminDetailView, string> = {
  users: "Users",
  "beta-users": "Free beta seats",
  documents: "Documents",
  comments: "Comments",
  "pending-suggestions": "Pending suggestions",
  waitlist: "Waitlist",
};

function formatDate(date: Date | null) {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function humanize(value: string | null) {
  if (!value) return "Not set";
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function Account({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  return (
    <div className="min-w-48">
      <p className="font-medium text-[var(--foreground)]">
        {name || "Unnamed user"}
      </p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        {email || "No email"}
      </p>
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-2 py-1 text-xs font-medium whitespace-nowrap">
      {children}
    </span>
  );
}

function TableShell({
  headings,
  children,
  emptyMessage,
  isEmpty,
}: {
  headings: string[];
  children: ReactNode;
  emptyMessage: string;
  isEmpty: boolean;
}) {
  if (isEmpty) {
    return <p className="p-6 text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[64rem] text-left text-sm">
        <thead className="bg-[var(--surface-subtle)] text-[var(--muted)]">
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                scope="col"
                className="px-5 py-3 font-medium whitespace-nowrap"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">{children}</tbody>
      </table>
    </div>
  );
}

function Cell({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4 align-top">{children}</td>;
}

async function loadDetail(view: AdminDetailView, page: number) {
  const skip = (page - 1) * PAGE_SIZE;

  if (view === "users" || view === "beta-users") {
    const where = view === "beta-users" ? { betaSeat: { not: null } } : {};
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy:
          view === "beta-users"
            ? [{ betaSeat: "asc" }, { createdAt: "asc" }]
            : { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          passwordHash: true,
          betaSeat: true,
          betaGrantedAt: true,
          stripeSubscriptionStatus: true,
          createdAt: true,
          accounts: { select: { provider: true } },
          _count: { select: { documents: true, comments: true } },
        },
      }),
    ]);

    return {
      title: viewLabels[view],
      description:
        view === "beta-users"
          ? "Accounts currently occupying one of the 100 free beta seats."
          : "Registered accounts, sign-in state, subscription state, and activity totals.",
      total,
      table: (
        <TableShell
          headings={[
            view === "beta-users" ? "Seat" : "Account",
            ...(view === "beta-users" ? ["Account"] : []),
            "Sign-in methods",
            "Email",
            "Subscription",
            "Documents",
            "Comments",
            view === "beta-users" ? "Seat granted" : "Joined",
          ]}
          emptyMessage={
            view === "beta-users"
              ? "No free beta seats are occupied."
              : "No users have registered."
          }
          isEmpty={users.length === 0}
        >
          {users.map((user) => {
            const methods = [
              ...(user.passwordHash ? ["Password"] : []),
              ...new Set(user.accounts.map((account) => humanize(account.provider))),
            ];

            return (
              <tr key={user.id}>
                {view === "beta-users" ? (
                  <Cell>
                    <span className="font-mono font-semibold">
                      #{user.betaSeat}
                    </span>
                  </Cell>
                ) : null}
                <Cell>
                  <Account name={user.name} email={user.email} />
                </Cell>
                <Cell>{methods.length > 0 ? methods.join(", ") : "None"}</Cell>
                <Cell>
                  <Status>
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </Status>
                </Cell>
                <Cell>{humanize(user.stripeSubscriptionStatus)}</Cell>
                <Cell>{user._count.documents.toLocaleString()}</Cell>
                <Cell>{user._count.comments.toLocaleString()}</Cell>
                <Cell>
                  {formatDate(
                    view === "beta-users"
                      ? user.betaGrantedAt
                      : user.createdAt,
                  )}
                </Cell>
              </tr>
            );
          })}
        </TableShell>
      ),
    };
  }

  if (view === "documents") {
    const [total, documents] = await Promise.all([
      prisma.document.count({ where: { isPlaceholder: false } }),
      prisma.document.findMany({
        where: { isPlaceholder: false },
        orderBy: { updatedAt: "desc" },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          title: true,
          status: true,
          shareToken: true,
          sharePermission: true,
          revision: true,
          updatedAt: true,
          lastAccessedAt: true,
          owner: { select: { name: true, email: true } },
          _count: { select: { comments: true, collaborators: true } },
        },
      }),
    ]);

    return {
      title: viewLabels[view],
      description:
        "Document ownership and operational metadata. Document contents are not shown here.",
      total,
      table: (
        <TableShell
          headings={[
            "Document",
            "Owner",
            "Status",
            "Sharing",
            "Revision",
            "Comments",
            "Collaborators",
            "Updated",
            "Last accessed",
          ]}
          emptyMessage="No non-placeholder documents exist."
          isEmpty={documents.length === 0}
        >
          {documents.map((document) => (
            <tr key={document.id}>
              <Cell>
                <p className="max-w-72 font-medium text-[var(--foreground)]">
                  {document.title}
                </p>
              </Cell>
              <Cell>
                <Account
                  name={document.owner.name}
                  email={document.owner.email}
                />
              </Cell>
              <Cell>
                <Status>{humanize(document.status)}</Status>
              </Cell>
              <Cell>
                {document.shareToken
                  ? `Link: ${humanize(document.sharePermission)}`
                  : "Private"}
              </Cell>
              <Cell>{document.revision.toLocaleString()}</Cell>
              <Cell>{document._count.comments.toLocaleString()}</Cell>
              <Cell>{document._count.collaborators.toLocaleString()}</Cell>
              <Cell>{formatDate(document.updatedAt)}</Cell>
              <Cell>{formatDate(document.lastAccessedAt)}</Cell>
            </tr>
          ))}
        </TableShell>
      ),
    };
  }

  if (view === "comments") {
    const [total, comments] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          authorType: true,
          parentId: true,
          scope: true,
          intent: true,
          status: true,
          aiStatus: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { name: true, email: true } },
          document: {
            select: {
              title: true,
              owner: { select: { name: true, email: true } },
            },
          },
          suggestion: { select: { status: true } },
        },
      }),
    ]);

    return {
      title: viewLabels[view],
      description:
        "Comment workflow metadata across documents. Comment text and quoted document text are excluded.",
      total,
      table: (
        <TableShell
          headings={[
            "Document",
            "Document owner",
            "Author",
            "Type",
            "Intent",
            "Status",
            "AI status",
            "Suggestion",
            "Created",
          ]}
          emptyMessage="No comments exist."
          isEmpty={comments.length === 0}
        >
          {comments.map((comment) => (
            <tr key={comment.id}>
              <Cell>
                <p className="max-w-72 font-medium text-[var(--foreground)]">
                  {comment.document.title}
                </p>
              </Cell>
              <Cell>
                <Account
                  name={comment.document.owner.name}
                  email={comment.document.owner.email}
                />
              </Cell>
              <Cell>
                {comment.author ? (
                  <Account
                    name={comment.author.name}
                    email={comment.author.email}
                  />
                ) : (
                  humanize(comment.authorType)
                )}
              </Cell>
              <Cell>
                {comment.parentId ? "Reply" : humanize(comment.scope)}
              </Cell>
              <Cell>{humanize(comment.intent)}</Cell>
              <Cell>
                <Status>{humanize(comment.status)}</Status>
              </Cell>
              <Cell>{humanize(comment.aiStatus)}</Cell>
              <Cell>{humanize(comment.suggestion?.status ?? null)}</Cell>
              <Cell>{formatDate(comment.createdAt)}</Cell>
            </tr>
          ))}
        </TableShell>
      ),
    };
  }

  if (view === "pending-suggestions") {
    const [total, suggestions] = await Promise.all([
      prisma.suggestion.count({ where: { status: "PENDING" } }),
      prisma.suggestion.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          scope: true,
          createdAt: true,
          comment: {
            select: {
              intent: true,
              aiStatus: true,
              authorType: true,
              author: { select: { name: true, email: true } },
              document: {
                select: {
                  title: true,
                  owner: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      title: viewLabels[view],
      description:
        "Open proposed edits awaiting a user decision, oldest first. Proposed and original text are excluded.",
      total,
      table: (
        <TableShell
          headings={[
            "Document",
            "Document owner",
            "Requested by",
            "Scope",
            "Intent",
            "AI status",
            "Waiting since",
          ]}
          emptyMessage="No suggestions are awaiting a decision."
          isEmpty={suggestions.length === 0}
        >
          {suggestions.map((suggestion) => (
            <tr key={suggestion.id}>
              <Cell>
                <p className="max-w-72 font-medium text-[var(--foreground)]">
                  {suggestion.comment.document.title}
                </p>
              </Cell>
              <Cell>
                <Account
                  name={suggestion.comment.document.owner.name}
                  email={suggestion.comment.document.owner.email}
                />
              </Cell>
              <Cell>
                {suggestion.comment.author ? (
                  <Account
                    name={suggestion.comment.author.name}
                    email={suggestion.comment.author.email}
                  />
                ) : (
                  humanize(suggestion.comment.authorType)
                )}
              </Cell>
              <Cell>{humanize(suggestion.scope)}</Cell>
              <Cell>{humanize(suggestion.comment.intent)}</Cell>
              <Cell>{humanize(suggestion.comment.aiStatus)}</Cell>
              <Cell>{formatDate(suggestion.createdAt)}</Cell>
            </tr>
          ))}
        </TableShell>
      ),
    };
  }

  const [total, entries] = await Promise.all([
    prisma.waitlistEntry.count({ where: { status: "PENDING" } }),
    prisma.waitlistEntry.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        signupMethod: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    title: viewLabels[view],
    description:
      "Pending beta access requests, oldest first. Review actions remain in the admin console.",
    total,
    table: (
      <TableShell
        headings={["Applicant", "Sign-up method", "Requested", "Updated"]}
        emptyMessage="No beta requests are awaiting review."
        isEmpty={entries.length === 0}
      >
        {entries.map((entry) => (
          <tr key={entry.id}>
            <Cell>
              <Account name={entry.name} email={entry.email} />
            </Cell>
            <Cell>{humanize(entry.signupMethod)}</Cell>
            <Cell>{formatDate(entry.createdAt)}</Cell>
            <Cell>{formatDate(entry.updatedAt)}</Cell>
          </tr>
        ))}
      </TableShell>
    ),
  };
}

export default async function AdminDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ view: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ view: rawView }, { page: rawPage }] = await Promise.all([
    params,
    searchParams,
  ]);
  const view = parseAdminDetailView(rawView);
  if (!view) notFound();

  const page = parseAdminDetailPage(rawPage);
  const callbackUrl = `${adminDetailHref(view)}${page > 1 ? `?page=${page}` : ""}`;
  const session = await requireAdmin(callbackUrl);
  const detail = await loadDetail(view, page);
  const pageCount = Math.max(1, Math.ceil(detail.total / PAGE_SIZE));
  if (page > pageCount) {
    redirect(
      `${adminDetailHref(view)}${pageCount > 1 ? `?page=${pageCount}` : ""}`,
    );
  }

  const firstResult = detail.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(page * PAGE_SIZE, detail.total);
  const hasPreviousPage = page > 1;
  const hasNextPage = page * PAGE_SIZE < detail.total;

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-7 px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand href="/admin" />
        <nav
          className="flex items-center gap-4 text-sm text-[var(--muted)]"
          aria-label="Admin navigation"
        >
          <Link href="/admin" className="hover:text-[var(--foreground)]">
            Operations
          </Link>
          <Link
            href="/admin/feedback"
            className="hover:text-[var(--foreground)]"
          >
            Founder inbox
          </Link>
          <UserMenu user={session.user} />
        </nav>
      </header>

      <section>
        <p className="page-kicker mb-2">Admin details</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">
          {detail.title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          {detail.description}
        </p>
      </section>

      <nav
        className="flex gap-2 overflow-x-auto pb-1"
        aria-label="Admin detail views"
      >
        {adminDetailViews.map((detailView) => (
          <Link
            key={detailView}
            href={adminDetailHref(detailView)}
            aria-current={detailView === view ? "page" : undefined}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              detailView === view
                ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {viewLabels[detailView]}
          </Link>
        ))}
        <Link
          href="/admin/feedback?view=due"
          className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          Founder replies due
        </Link>
      </nav>

      <section className="app-panel overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <p className="text-sm font-medium">
            {detail.total.toLocaleString()} total
          </p>
          <p className="text-xs text-[var(--muted)]">
            Showing {firstResult.toLocaleString()}-{lastResult.toLocaleString()}
          </p>
        </div>
        {detail.table}
        {(hasPreviousPage || hasNextPage) && (
          <nav
            className="flex items-center justify-between gap-4 border-t border-[var(--border)] px-5 py-4"
            aria-label="Pagination"
          >
            {hasPreviousPage ? (
              <Link
                href={`${adminDetailHref(view)}?page=${page - 1}`}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:border-[var(--border-strong)]"
              >
                Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-[var(--muted)]">Page {page}</span>
            {hasNextPage ? (
              <Link
                href={`${adminDetailHref(view)}?page=${page + 1}`}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:border-[var(--border-strong)]"
              >
                Next
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </main>
  );
}
