import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Brand } from "@/components/Brand";
import { DeleteDocumentDialog } from "@/components/documents/DeleteDocumentDialog";
import { DocumentNavigationLink } from "@/components/documents/DocumentNavigationLink";
import {
  documentAccessWhere,
  effectiveDocumentPermission,
  getDocumentForUser,
  normalizeCollaboratorEmail,
} from "@/lib/documentAuth";
import { createBlankDocument } from "@/app/document-actions";

const lastAccessedFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

async function deleteDocument(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const document = await getDocumentForUser(
    id,
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
          <div className="border-t border-[var(--border-strong)]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-[var(--border)] py-2 text-xs text-[var(--muted)] sm:grid-cols-[minmax(0,1fr)_11rem_7rem_7rem]">
              <span>Title</span>
              <span className="hidden sm:block">Last accessed</span>
              <span className="hidden sm:block">Status</span>
              <span className="text-right">Action</span>
            </div>
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {documents.map((doc) => {
                const permission = effectiveDocumentPermission({
                  ownerId: doc.ownerId,
                  userId: session.user.id,
                  collaboratorPermission: doc.collaborators[0]?.permission,
                });
                const isOwner = doc.ownerId === session.user.id;

                return (
                  <li
                    key={doc.id}
                    className="document-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-2 py-5 sm:grid-cols-[minmax(0,1fr)_11rem_7rem_7rem]"
                  >
                    <div className="min-w-0">
                      <DocumentNavigationLink
                        href={
                          doc.status === "READY"
                            ? `/documents/${doc.id}/edit`
                            : `/documents/${doc.id}/wizard`
                        }
                      >
                        {doc.title}
                      </DocumentNavigationLink>
                      {!isOwner && (
                        <p className="mt-1 truncate text-xs text-[var(--muted)]">
                          Shared by {doc.owner.name || "the document owner"}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[var(--muted)] sm:hidden">
                        Accessed{" "}
                        <time dateTime={doc.lastAccessedAt.toISOString()}>
                          {lastAccessedFormatter.format(doc.lastAccessedAt)}
                        </time>
                      </p>
                    </div>
                    <time
                      dateTime={doc.lastAccessedAt.toISOString()}
                      className="hidden text-xs text-[var(--muted)] sm:block"
                    >
                      {lastAccessedFormatter.format(doc.lastAccessedAt)}
                    </time>
                    <span className="hidden text-xs capitalize text-[var(--muted)] sm:block">
                      {doc.status.toLowerCase()}
                    </span>
                    <div className="text-right">
                      {permission === "FULL" ? (
                        <DeleteDocumentDialog
                          documentId={doc.id}
                          documentTitle={doc.title}
                          deleteAction={deleteDocument}
                        />
                      ) : (
                        <span className="text-xs capitalize text-[var(--muted)]">
                          {permission.toLowerCase()}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
