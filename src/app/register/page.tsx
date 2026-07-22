import Link from "next/link";

import { Brand } from "@/components/Brand";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { safeRedirectPath } from "@/lib/authInput";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeRedirectPath(
    Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl,
  );

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6 sm:p-8">
      <section className="app-panel relative flex w-full max-w-md flex-col items-center gap-6 rounded-3xl p-7 sm:p-10">
        <Brand href="/register" />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="page-kicker">Create your account</p>
          <h1 className="text-3xl font-semibold tracking-[-0.045em]">
            Start writing with Thido.
          </h1>
          <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
            Use an email and password. You can still sign in with Google from
            the login page.
          </p>
        </div>
        <RegisterForm callbackUrl={callbackUrl} />
        <p className="text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-link font-medium text-[var(--foreground)]"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
