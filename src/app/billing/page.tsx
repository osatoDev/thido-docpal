import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/account/UserMenu";
import { BillingPanel } from "@/components/settings/BillingPanel";
import { auth } from "@/lib/auth";
import { getBillingOffer } from "@/lib/billing";
import { getAiAllowanceStatus } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/billing");
  }

  const [user, billingOffer, aiAllowance, query] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        betaSeat: true,
        stripeSubscriptionStatus: true,
        stripeCurrentPeriodEnd: true,
        stripeCancelAtPeriodEnd: true,
      },
    }),
    getBillingOffer(),
    getAiAllowanceStatus(session.user.id),
    searchParams,
  ]);
  if (!user?.betaSeat) {
    redirect("/login?notice=session-expired");
  }
  const billingNotice = Array.isArray(query.billing)
    ? query.billing[0]
    : query.billing;

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-12 px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand />
        <nav
          className="flex items-center gap-4 text-sm text-[var(--muted)]"
          aria-label="Account navigation"
        >
          <Link href="/settings" className="hover:text-[var(--foreground)]">
            Settings
          </Link>
          <Link href="/plan" className="hover:text-[var(--foreground)]">
            All documents
          </Link>
          <UserMenu user={session.user} />
        </nav>
      </header>

      <div>
        <p className="page-kicker mb-3">Account</p>
        <h1 className="page-title">Plan and billing</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Signed in as {session.user.email}
        </p>
      </div>

      <BillingPanel
        subscriptionStatus={user.stripeSubscriptionStatus}
        currentPeriodEnd={user.stripeCurrentPeriodEnd}
        cancelAtPeriodEnd={user.stripeCancelAtPeriodEnd}
        offer={billingOffer}
        notice={billingNotice}
        aiAllowance={aiAllowance}
        layout="standalone"
      />
    </main>
  );
}
