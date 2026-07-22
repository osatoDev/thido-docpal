import { isTestLoginEnabled, signIn } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { safeRedirectPath } from "@/lib/authInput";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    notice?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeRedirectPath(
    Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl,
  );
  const notice = Array.isArray(params.notice) ? params.notice[0] : params.notice;
  const noticeMessage =
    notice === "session-expired"
      ? "Your previous session is no longer valid. Please sign in again."
      : notice === "sign-in-required"
        ? "Please sign in to continue."
        : notice === "signed-out"
          ? "You have signed out successfully."
          : null;

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -left-32 top-8 h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--warm)_15%,transparent)] blur-3xl" />
      <section className="app-panel relative flex w-full max-w-md flex-col items-center gap-6 rounded-3xl p-7 sm:p-10">
        <Brand href="/login" />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-mono text-[0.65rem] font-semibold tracking-[0.2em] text-[var(--accent-strong)] uppercase">
            Think · Draft · Refine
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.045em]">
            Think clearly. Draft confidently.
          </h1>
          <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
            Turn early thoughts into a strong first draft, then refine every
            line with focused AI feedback.
          </p>
        </div>
        {noticeMessage && (
          <div
            role="status"
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-5 text-[var(--foreground)]"
          >
            {noticeMessage}
          </div>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="primary-button w-full rounded-xl px-4 py-3 text-sm font-semibold"
          >
            Continue with Google
          </button>
        </form>

        <div className="flex w-full items-center gap-3 text-xs text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span>or use email</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <EmailLoginForm callbackUrl={callbackUrl} />
        <p className="text-center text-sm text-[var(--muted)]">
          New to Thido?{" "}
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-link font-medium text-[var(--foreground)]"
          >
            Create an account
          </Link>
        </p>

        {isTestLoginEnabled && (
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("test-login", {
                email: formData.get("email"),
                name: formData.get("name"),
                redirectTo: "/",
              });
            }}
            className="flex w-full flex-col gap-3 border-t border-[var(--border)] pt-6"
          >
            <p className="font-mono text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              Local test login
            </p>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="app-input rounded-xl px-3 py-2.5 text-sm outline-none"
            />
            <input
              type="text"
              name="name"
              placeholder="Name (optional)"
              className="app-input rounded-xl px-3 py-2.5 text-sm outline-none"
            />
            <button
              type="submit"
              className="secondary-button rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Continue without Google
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
