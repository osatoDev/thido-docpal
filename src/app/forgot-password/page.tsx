import Link from "next/link";

import { Brand } from "@/components/Brand";
import { PasswordResetRequestForm } from "@/components/auth/PasswordResetRequestForm";

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6 sm:p-8">
      <section className="app-panel relative flex w-full max-w-md flex-col items-center gap-6 rounded-3xl p-7 sm:p-10">
        <Brand href="/forgot-password" />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="page-kicker">Account recovery</p>
          <h1 className="text-3xl font-semibold tracking-[-0.045em]">
            Reset your password.
          </h1>
          <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
            Enter your email and we&apos;ll send a one-time link if it belongs
            to a password account.
          </p>
        </div>
        <PasswordResetRequestForm />
        <Link href="/login" className="text-link text-sm font-medium">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
