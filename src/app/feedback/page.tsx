import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/Brand";
import { FeedbackConversation } from "@/components/feedback/FeedbackConversation";
import { auth } from "@/lib/auth";
import { sanitizeFeedbackPath } from "@/lib/feedback";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Message the founders — Thido",
};

const messageDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/feedback");
  }

  const [thread, query] = await Promise.all([
    prisma.feedbackThread.findUnique({
      where: { userId: session.user.id },
      select: {
        category: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            authorType: true,
            body: true,
            createdAt: true,
          },
        },
      },
    }),
    searchParams,
  ]);
  const sourcePath = sanitizeFeedbackPath(
    Array.isArray(query.from) ? query.from[0] : query.from,
  );

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-10 px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand />
        <nav
          aria-label="Feedback navigation"
          className="flex items-center gap-4 text-sm text-[var(--muted)]"
        >
          <Link href="/dashboard" className="hover:text-[var(--foreground)]">
            All documents
          </Link>
          <Link href="/settings" className="hover:text-[var(--foreground)]">
            Settings
          </Link>
        </nav>
      </header>

      <section className="max-w-3xl">
        <p className="page-kicker mb-3">Private beta feedback</p>
        <h1 className="page-title">Talk directly with the founders.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Tell us what is confusing, broken, or missing. We try to respond
          immediately and otherwise within eight hours.
        </p>
      </section>

      <FeedbackConversation
        messages={(thread?.messages ?? []).map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString(),
          createdAtLabel: messageDateFormatter.format(message.createdAt),
        }))}
        initialCategory={thread?.category ?? "OTHER"}
        contextPath={sourcePath}
      />
    </main>
  );
}
