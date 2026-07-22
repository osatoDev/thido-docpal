import Link from "next/link";

import { Brand } from "@/components/Brand";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const validTokenShape = typeof token === "string" && token.length >= 32;

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6 sm:p-8">
      <section className="app-panel relative flex w-full max-w-md flex-col items-center gap-6 rounded-3xl p-7 sm:p-10">
        <Brand href="/reset-password" />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="page-kicker">Account recovery</p>
          <h1 className="text-3xl font-semibold tracking-[-0.045em]">
            Choose a new password.
          </h1>
          <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
            Reset links expire after one hour and can only be used once.
          </p>
        </div>
        {validTokenShape ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="flex w-full flex-col gap-4 text-center">
            <p role="alert" className="text-sm text-[var(--danger)]">
              This reset link is incomplete or invalid.
            </p>
            <Link
              href="/forgot-password"
              className="primary-button rounded-xl px-4 py-3 text-sm font-semibold"
            >
              Request a new link
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
