import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Brand } from "@/components/Brand";
import {
  DashboardDocumentTable,
  type DashboardDocumentRow,
} from "@/components/documents/DashboardDocumentTable";
import {
  documentAccessWhere,
  effectiveDocumentPermission,
  getDocumentForUser,
  normalizeCollaboratorEmail,
} from "@/lib/documentAuth";
import { createBlankDocument } from "@/app/document-actions";

async function deleteDocument(documentId: string) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;

  const document = await getDocumentForUser(
    documentId,
    session.user.id,
    session.user.email,
    "FULL",
  );
  if (document) {
    await prisma.document.delete({ where: { id: document.id } });
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/dashboard");
  }

  const documents = await prisma.document.findMany({
    where: documentAccessWhere(session.user.id, session.user.email, "VIEW"),
    orderBy: { updatedAt: "desc" },
    include: {
      owner: { select: { name: true } },
      collaborators: {
        where: {
          email: normalizeCollaboratorEmail(session.user.email ?? ""),
        },
        select: { permission: true },
      },
    },
  });
  const documentRows: DashboardDocumentRow[] = documents.map((document) => ({
    id: document.id,
    title: document.title,
    href:
      document.status === "READY"
        ? `/documents/${document.id}/edit`
        : `/documents/${document.id}/wizard`,
    lastAccessedAt: document.lastAccessedAt.toISOString(),
    ownerName: document.owner.name,
    isOwner: document.ownerId === session.user.id,
    permission: effectiveDocumentPermission({
      ownerId: document.ownerId,
      userId: session.user.id,
      collaboratorPermission: document.collaborators[0]?.permission,
    }),
    status: document.status,
  }));

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
            href="/settings"
            prefetch
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Settings
          </Link>
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
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login?notice=signed-out" });
            }}
          >
            <button
              type="submit"
              className="secondary-button rounded-md px-3 py-2.5 text-sm"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="flex flex-col gap-8">
        <div className="max-w-2xl">
          <p className="page-kicker mb-3">Your documents</p>
          <h1 className="page-title">Pick up where you left off.</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            Draft, revise, and keep the thinking behind every document in one
            place.
          </p>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-start gap-3 border-y border-[var(--border)] py-10">
            <p className="text-lg font-medium">A clear page, ready when you are.</p>
            <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
              Open a blank page and start writing, or ask Thido to prepare a
              first draft from a brief.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <form action={createBlankDocument}>
                <button
                  type="submit"
                  className="text-sm font-semibold text-[var(--accent-strong)] hover:underline"
                >
                  Create a blank document →
                </button>
              </form>
              <Link
                href="/documents/new"
                prefetch
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Draft with AI
              </Link>
            </div>
          </div>
        ) : (
          <DashboardDocumentTable
            documents={documentRows}
            deleteAction={deleteDocument}
          />
        )}
      </section>
    </main>
  );
}
