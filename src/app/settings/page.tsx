import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAiModelId, DEFAULT_AI_MODEL } from "@/lib/ai/models";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/account/UserMenu";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { ConnectedAccounts } from "@/components/settings/ConnectedAccounts";
import { SecurityPanel } from "@/components/settings/SecurityPanel";
import { AccountDataPanel } from "@/components/settings/AccountDataPanel";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    accounts?: string | string[];
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/settings");
  }

  const [settings, user, query] = await Promise.all([
    prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        betaSeat: true,
        passwordHash: true,
        accounts: { select: { provider: true } },
      },
    }),
    searchParams,
  ]);
  if (!user?.betaSeat) {
    redirect("/login?notice=session-expired");
  }
  const accountsNotice = Array.isArray(query.accounts)
    ? query.accounts[0]
    : query.accounts;

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-12 px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand />
        <nav
          className="flex items-center gap-4 text-sm text-[var(--muted)]"
          aria-label="Settings navigation"
        >
          <Link href="/plan" className="hover:text-[var(--foreground)]">
            All documents
          </Link>
          <Link href="/" className="hover:text-[var(--foreground)]">
            Open Thido
          </Link>
          <UserMenu user={session.user} />
        </nav>
      </header>

      <div>
        <p className="page-kicker mb-3">Preferences</p>
        <h1 className="page-title">Settings</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Signed in as {session.user.email}
        </p>
      </div>

      <SettingsForm
        initialAiModel={
          isAiModelId(settings.aiModel) ? settings.aiModel : DEFAULT_AI_MODEL
        }
        initialChecklistMoveControls={settings.checklistMoveControls}
        initialPlanFeedbackDailyLimit={settings.planFeedbackDailyLimit}
        initialDailyPlanEmail={settings.dailyPlanEmail}
      />
      {/* <ConnectedAccounts
        email={user.email ?? session.user.email ?? "your email"}
        hasGoogle={user.accounts.some((account) => account.provider === "google")}
        hasPassword={Boolean(user.passwordHash)}
        notice={accountsNotice}
      /> */}
      <SecurityPanel />
      <AccountDataPanel />
    </main>
  );
}
