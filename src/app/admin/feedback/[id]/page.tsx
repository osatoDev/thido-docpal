import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/account/UserMenu";
import { FounderReplyForm } from "@/components/feedback/FounderReplyForm";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Founder conversation | Thido",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function FounderConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdmin(`/admin/feedback/${id}`);
  const thread = await prisma.feedbackThread.findUnique({
    where: { id },
    select: {
      id: true,
      category: true,
      currentPath: true,
      responseDueAt: true,
      user: { select: { name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          authorType: true,
          body: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      },
    },
  });
  if (!thread) notFound();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand href="/admin/feedback" />
        <div className="flex items-center gap-4">
          <Link
            href="/admin/feedback"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← Founder inbox
          </Link>
          <UserMenu user={session.user} />
        </div>
      </header>

      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="page-kicker mb-2">{thread.category.toLowerCase()}</p>
          <h1 className="font-serif text-4xl tracking-[-0.035em]">
            {thread.user.name || thread.user.email || "Thido user"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {thread.user.email}
            {thread.currentPath ? ` · ${thread.currentPath}` : ""}
          </p>
        </div>
        {thread.responseDueAt && (
          <p className="text-sm text-[var(--warm)]">
            Reply due {formatDate(thread.responseDueAt)}
          </p>
        )}
      </section>

      <div className="grid min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="app-panel flex max-h-[42rem] flex-col gap-4 overflow-y-auto rounded-2xl p-5 sm:p-6">
          {thread.messages.map((message) => {
            const founder = message.authorType === "FOUNDER";
            return (
              <article
                key={message.id}
                className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  founder
                    ? "self-end bg-[color-mix(in_srgb,var(--accent)_28%,var(--surface))]"
                    : "self-start bg-[var(--surface-subtle)]"
                }`}
              >
                <p className="text-xs font-semibold text-[var(--muted)]">
                  {founder
                    ? message.author?.name || "Founding team"
                    : thread.user.name || "User"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                  {message.body}
                </p>
                <time className="mt-2 block text-[0.65rem] text-[var(--muted-soft)]">
                  {formatDate(message.createdAt)}
                </time>
              </article>
            );
          })}
        </section>

        <aside className="app-panel h-fit rounded-2xl p-5 sm:p-6">
          <FounderReplyForm threadId={thread.id} />
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            The reply is saved here and emailed to {thread.user.email ?? "the user"}.
          </p>
        </aside>
      </div>
    </main>
  );
}
