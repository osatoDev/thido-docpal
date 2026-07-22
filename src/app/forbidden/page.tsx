import Link from "next/link";

import { Brand } from "@/components/Brand";
import { auth, signOut } from "@/lib/auth";

export default async function ForbiddenPage() {
  const session = await auth();

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col justify-center gap-10 px-5 py-12 sm:px-6 lg:px-8">
      <Brand />
      <section className="max-w-xl border-t border-[var(--border-strong)] pt-8">
        <p className="page-kicker mb-3">Access denied</p>
        <h1 className="page-title">This area isn&apos;t available to you.</h1>
        <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
          {session?.user?.email
            ? `You are signed in as ${session.user.email}, but this account does not have administrator access.`
            : "You need an authorized account to open this area."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="primary-button rounded-md px-4 py-2.5 text-sm font-medium"
              >
                Return to documents
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({
                    redirectTo:
                      "/login?notice=signed-out&callbackUrl=%2Fadmin",
                  });
                }}
              >
                <button
                  type="submit"
                  className="secondary-button rounded-md px-4 py-2.5 text-sm font-medium"
                >
                  Use another account
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login?notice=sign-in-required&callbackUrl=/admin"
              className="primary-button rounded-md px-4 py-2.5 text-sm font-medium"
            >
              Sign in
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
