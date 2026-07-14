import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAiModelId, DEFAULT_AI_MODEL } from "@/lib/ai/models";
import { Brand } from "@/components/Brand";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-5 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand />
        <nav className="flex items-center gap-4 text-sm text-[var(--muted)]" aria-label="Settings navigation">
          <Link href="/dashboard" className="hover:text-[var(--foreground)]">
            All documents
          </Link>
          <Link href="/" className="hover:text-[var(--foreground)]">
            Open Thido
          </Link>
        </nav>
      </header>

      <div>
        <p className="mb-1 font-mono text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
          Preferences
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Settings</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Signed in as {session.user.email}
        </p>
      </div>

      <SettingsForm
        initialAiModel={isAiModelId(settings.aiModel) ? settings.aiModel : DEFAULT_AI_MODEL}
        initialCommentMode={settings.aiCommentMode}
        initialDocumentStartMode={settings.documentStartMode}
      />
    </main>
  );
}
