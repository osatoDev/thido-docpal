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
import { documentEditPath } from "@/lib/documentUrls";
import { countDocumentWords } from "@/lib/documentWordCount";
import {
  createDocumentFolder,
  deleteDocumentFolder,
  moveLibraryItemToFolder,
  renameDocumentFolder,
} from "@/app/folder-actions";
import {
  expireStaleCommentAiJobs,
  hasActiveCommentAiJob,
  lockDocumentForCommentAi,
} from "@/lib/documentAiJobs";

async function deleteLibraryItem(
  documentId: string,
  itemKind: "DOCUMENT" | "SPREADSHEET",
) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return false;

  if (itemKind === "SPREADSHEET") {
    const result = await prisma.spreadsheet.deleteMany({
      where: { id: documentId, ownerId: session.user.id },
    });
    return result.count > 0;
  }
  if (itemKind !== "DOCUMENT") return false;

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
    if (await hasActiveCommentAiJob(transaction, document.id)) {
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

  const [documents, spreadsheets, folders] = await Promise.all([
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
    prisma.spreadsheet.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        folderId: true,
        lastAccessedAt: true,
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
        ? documentEditPath(document.id, document.title)
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
    kind: "DOCUMENT",
    wordCount: countDocumentWords(document.content),
  }));
  const spreadsheetRows: DashboardDocumentRow[] = spreadsheets.map(
    (spreadsheet) => ({
      id: spreadsheet.id,
      title: spreadsheet.title,
      href: `/spreadsheets/${spreadsheet.id}/edit`,
      folderId: spreadsheet.folderId,
      lastAccessedAt: spreadsheet.lastAccessedAt.toISOString(),
      ownerName: session.user.name ?? null,
      isOwner: true,
      permission: "FULL",
      status: "READY",
      kind: "SPREADSHEET",
      wordCount: null,
    }),
  );
  const libraryRows = [...documentRows, ...spreadsheetRows];
  const folderRows: DashboardFolderRow[] = folders;

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-14 px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-col gap-6 border-b border-[var(--border)] pb-7 sm:flex-row sm:items-center sm:justify-between">
        <Brand />
        <div className="flex flex-wrap items-center gap-3">
          {isAdminEmail(session.user.email) && (
            <Link
              href="/admin"
              prefetch
              className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Admin
            </Link>
          )}
          <UserMenu user={session.user} />
        </div>
      </header>

      <section className="flex flex-col gap-8">
        <div className="max-w-2xl">
          <p className="page-kicker mb-3">Your work</p>
          <h1 className="page-title">Pick up where you left off.</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            Write documents, work with spreadsheet data, and organize related
            files into folders that make sense to you.
          </p>
        </div>

        <DashboardDocumentTable
          documents={libraryRows}
          folders={folderRows}
          deleteAction={deleteLibraryItem}
          createFolderAction={createDocumentFolder}
          renameFolderAction={renameDocumentFolder}
          deleteFolderAction={deleteDocumentFolder}
          moveDocumentAction={moveLibraryItemToFolder}
        />
      </section>
    </main>
  );
}
