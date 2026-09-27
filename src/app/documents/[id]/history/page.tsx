import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentEditPath } from "@/lib/documentUrls";
import { HistoryRetentionControl } from "@/components/documents/HistoryRetentionControl";

export const metadata = { title: "Keep your version history | Thido" };

export default async function HistoryRetentionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/documents/${id}/history`)}`);
  const document = await prisma.document.findFirst({
    where: { id, ownerId: session.user.id },
    select: { title: true, historyRetention: { select: { keepAll: true, deleteAfter: true } } },
  });
  if (!document) notFound();
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <p className="page-kicker">Your drafts, your choice</p>
      <h1 className="page-title mt-3">Keep your version history</h1>
      <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">
        Older drafts of “{document.title}” may hold ideas you want to come back to.
        Choose Keep all versions to stop automatic cleanup for this document.
        Your current document is never removed by history cleanup.
      </p>
      <div className="my-6">
        <HistoryRetentionControl documentId={id} initial={{
          canManage: true,
          keepAll: document.historyRetention?.keepAll ?? false,
          deleteAfter: document.historyRetention?.deleteAfter?.toISOString() ?? null,
        }} />
      </div>
      <Link href={documentEditPath(id, document.title)} className="text-sm underline underline-offset-4">Open document and review version history</Link>
    </main>
  );
}
