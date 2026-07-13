import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Brand } from "@/components/Brand";

async function deleteDocument(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  await prisma.document.deleteMany({
    where: { id, ownerId: session.user.id },
  });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const documents = await prisma.document.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-10 p-5 sm:p-8">
      <header className="flex flex-col gap-6 border-b border-[var(--border)] pb-7 sm:flex-row sm:items-center sm:justify-between">
        <Brand />
        <div className="flex items-center gap-3">
          <Link
            href="/documents/new"
            className="primary-button rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            New document
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="secondary-button rounded-xl px-3 py-2.5 text-sm"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="flex flex-col gap-6">
        <div>
          <p className="mb-1 font-mono text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
            Your workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Documents</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{session.user.email}</p>
        </div>

        {documents.length === 0 ? (
          <div className="app-panel flex flex-col items-start gap-3 rounded-2xl border-dashed p-8">
            <p className="font-medium">A clear page, ready when you are.</p>
            <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
              Answer a few focused questions and ThidoDocPal will shape them
              into a first draft you can edit and discuss.
            </p>
            <Link href="/documents/new" className="text-sm font-semibold text-[var(--accent-strong)] hover:underline">
              Create your first document →
            </Link>
          </div>
        ) : (
        <ul className="app-panel flex flex-col divide-y divide-[var(--border)] overflow-hidden rounded-2xl">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-4 p-5 hover:bg-[var(--surface-subtle)]">
              <Link
                href={
                  doc.status === "READY"
                    ? `/documents/${doc.id}/edit`
                    : `/documents/${doc.id}/wizard`
                }
                className="flex-1 text-sm font-semibold"
              >
                {doc.title}
                <span className="ml-2 rounded-full bg-[var(--surface-subtle)] px-2 py-1 font-mono text-[0.6rem] font-medium tracking-wide text-[var(--muted)]">
                  {doc.status.toLowerCase()}
                </span>
              </Link>
              <form action={deleteDocument}>
                <input type="hidden" name="id" value={doc.id} />
                <button
                  type="submit"
                  className="text-xs text-[var(--muted-soft)] hover:text-[var(--danger)]"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
        )}
      </section>
    </main>
  );
}
