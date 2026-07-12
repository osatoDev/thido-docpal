import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your documents</h1>
          <p className="text-sm text-gray-500">{session.user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/documents/new"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            New Document
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {documents.length === 0 ? (
        <p className="text-sm text-gray-500">
          No documents yet. Create one to get started.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between p-4">
              <Link
                href={
                  doc.status === "READY"
                    ? `/documents/${doc.id}/edit`
                    : `/documents/${doc.id}/wizard`
                }
                className="flex-1 text-sm font-medium hover:underline"
              >
                {doc.title}
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {doc.status}
                </span>
              </Link>
              <form action={deleteDocument}>
                <input type="hidden" name="id" value={doc.id} />
                <button
                  type="submit"
                  className="text-xs text-gray-400 hover:text-red-600"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
