import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/account/UserMenu";
import { DeleteDocumentDialog } from "@/components/documents/DeleteDocumentDialog";
import { DocumentNavigationLink } from "@/components/documents/DocumentNavigationLink";
import { auth } from "@/lib/auth";
import { getDocumentForUser, lockDocumentRow } from "@/lib/documentAuth";
import { documentEditPath } from "@/lib/documentUrls";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Older documents | Thido" };

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

const lastOpenedFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

/** Documents from before Thido became a planner, kept so nothing is lost. */
export default async function OlderDocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/documents");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { planDocumentId: true },
  });
  const documents = await prisma.document.findMany({
    where: {
      ownerId: session.user.id,
      isPlaceholder: false,
      ...(user?.planDocumentId ? { id: { not: user.planDocumentId } } : {}),
    },
    orderBy: { lastAccessedAt: "desc" },
    select: { id: true, title: true, lastAccessedAt: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-10 px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand href="/plan" />
        <div className="flex items-center gap-3">
          <Link
            href="/plan"
            className="secondary-button rounded-md px-3.5 py-2 text-sm font-medium"
          >
            My plan
          </Link>
          <UserMenu user={session.user} />
        </div>
      </header>

      <section className="flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">
            Older documents
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Documents you made before Thido became a day planner. You can still
            open and edit them, or delete the ones you no longer need.
          </p>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">You have no older documents.</p>
        ) : (
          <ul className="app-panel divide-y divide-[var(--border)] rounded-xl">
            {documents.map((document) => (
              <li
                key={document.id}
                className="document-row flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <DocumentNavigationLink href={documentEditPath(document.id, document.title)}>
                    {document.title}
                  </DocumentNavigationLink>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Last opened{" "}
                    <time dateTime={document.lastAccessedAt.toISOString()}>
                      {lastOpenedFormatter.format(document.lastAccessedAt)}
                    </time>
                  </p>
                </div>
                <DeleteDocumentDialog
                  documentId={document.id}
                  documentTitle={document.title}
                  deleteAction={deleteDocument}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
