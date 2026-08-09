import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/account/UserMenu";
import {
  DashboardDocumentTable,
  type DashboardDocumentRow,
  type DashboardFolderRow,
} from "@/components/documents/DashboardDocumentTable";
import {
  documentAccessWhere,
  effectiveDocumentPermission,
  getDocumentForUser,
  normalizeCollaboratorEmail,
} from "@/lib/documentAuth";
import { createBlankDocument } from "@/app/document-actions";
import {
  createDocumentFolder,
  deleteDocumentFolder,
  moveDocumentToFolder,
  renameDocumentFolder,
} from "@/app/folder-actions";
import {
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  lockDocumentForCommentAi,
} from "@/lib/documentAiJobs";

async function deleteDocument(documentId: string) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return false;

  const document = await getDocumentForUser(
    documentId,
    session.user.id,
    session.user.email,
    "FULL",
  );
  if (!document) return false;

  return prisma.$transaction(async (transaction) => {
    const documentExists = await lockDocumentForCommentAi(
      transaction,
      document.id,
    );
    if (!documentExists) return false;

    await expireStaleCommentAiJobs(transaction, document.id);
    if (
      await hasActiveCommentAiJob(transaction, document.id, {
        documentWideOnly: true,
      })
    ) {
      return false;
    }
    await transaction.document.delete({ where: { id: document.id } });
    return true;
  });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/dashboard");
  }

  const [documents, folders] = await Promise.all([
    prisma.document.findMany({
      where: {
        AND: [
          documentAccessWhere(session.user.id, session.user.email, "VIEW"),
          { isPlaceholder: false },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { name: true } },
        collaborators: {
          where: {
            email: normalizeCollaboratorEmail(session.user.email ?? ""),
          },
          select: { permission: true },
        },
        linkAccesses: {
          where: { userId: session.user.id },
          select: { id: true },
          take: 1,
        },
      },
    }),
    prisma.documentFolder.findMany({
      where: { ownerId: session.user.id },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  const documentRows: DashboardDocumentRow[] = documents.map((document) => ({
    id: document.id,
    title: document.title,
    href:
      document.status === "READY"
        ? `/documents/${document.id}/edit`
        : `/documents/${document.id}/wizard`,
    folderId: document.ownerId === session.user.id ? document.folderId : null,
    lastAccessedAt: document.lastAccessedAt.toISOString(),
    ownerName: document.owner.name,
    isOwner: document.ownerId === session.user.id,
    permission: effectiveDocumentPermission({
      ownerId: document.ownerId,
      userId: session.user.id,
      collaboratorPermission: document.collaborators[0]?.permission,
      linkPermission:
        document.shareToken && document.linkAccesses.length > 0
          ? document.sharePermission
          : null,
    }),
    status: document.status,
  }));
  const folderRows: DashboardFolderRow[] = folders;

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-14 px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-col gap-6 border-b border-[var(--border)] pb-7 sm:flex-row sm:items-center sm:justify-between">
        <Brand />
        <div className="flex items-center gap-3">
          {isAdminEmail(session.user.email) && (
            <Link
              href="/admin"
              prefetch
              className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Admin
            </Link>
          )}
          <Link
            href="/documents/new"
            prefetch
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Draft with AI
          </Link>
          <form action={createBlankDocument}>
            <button
              type="submit"
              className="primary-button rounded-md px-4 py-2.5 text-sm font-medium"
            >
              New document
            </button>
          </form>
          <UserMenu user={session.user} />
        </div>
      </header>

      <section className="flex flex-col gap-8">
        <div className="max-w-2xl">
          <p className="page-kicker mb-3">Your documents</p>
          <h1 className="page-title">Pick up where you left off.</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            Draft, revise, and organize related work into folders that make
            sense to you.
          </p>
        </div>

        <DashboardDocumentTable
          documents={documentRows}
          folders={folderRows}
          deleteAction={deleteDocument}
          createFolderAction={createDocumentFolder}
          renameFolderAction={renameDocumentFolder}
          deleteFolderAction={deleteDocumentFolder}
          moveDocumentAction={moveDocumentToFolder}
        />
      </section>
    </main>
  );
}
