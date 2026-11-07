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
  getDocumentForUser,
  lockDocumentRow,
} from "@/lib/documentAuth";
import { documentEditPath } from "@/lib/documentUrls";
import { countDocumentWords } from "@/lib/documentWordCount";
import {
  createDocumentFolder,
  deleteDocumentFolder,
  moveDocumentToFolder,
  renameDocumentFolder,
} from "@/app/folder-actions";

async function deleteDocument(documentId: string) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return false;

  const document = await getDocumentForUser(documentId, session.user.id);
  if (!document) return false;

  return prisma.$transaction(async (transaction) => {
    if (!(await lockDocumentRow(transaction, document.id))) return false;
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
        AND: [documentAccessWhere(session.user.id), { isPlaceholder: false }],
      },
      orderBy: { updatedAt: "desc" },
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
    href: documentEditPath(document.id, document.title),
    folderId: document.folderId,
    lastAccessedAt: document.lastAccessedAt.toISOString(),
    wordCount: countDocumentWords(document.content),
  }));
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
            Your plans and notes, organized into folders that make sense to
            you.
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
