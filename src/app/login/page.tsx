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
    error?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeRedirectPath(
    Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl,
  );
  const notice = Array.isArray(params.notice) ? params.notice[0] : params.notice;
  const authError = Array.isArray(params.error) ? params.error[0] : params.error;
  const noticeMessage =
    authError === "AccessDenied"
      ? "The first 100 beta places are full. If you tried to create an account with Google, you’ve been added to the waitlist and we’ll email you after review."
      : authError === "OAuthAccountNotLinked"
        ? "Google could not be connected to the existing Thido account for this email. Try your original sign-in method or contact support."
      : notice === "draft-ready"
        ? "Your document brief is ready. Sign in to generate it and save it to your account."
        : notice === "session-expired"
          ? "Your previous session is no longer valid. Please sign in again."
          : notice === "sign-in-required"
            ? "Please sign in to continue."
            : notice === "signed-out"
              ? "You have signed out successfully."
              : notice === "email-verified"
                ? "Your email is verified. You can sign in now."
                : notice === "password-reset"
                  ? "Your password has been updated. Sign in with your new password."
                  : notice === "signed-out-all-devices"
                    ? "You have been signed out of all devices. Sign in again to continue."
                    : notice === "account-deleted"
                      ? "Your Thido account and its data have been deleted."
                      : null;

  return (
    <main className="relative flex flex-1 items-center overflow-hidden px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="pointer-events-none absolute -left-32 top-8 h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--warm)_15%,transparent)] blur-3xl" />
      <section
        aria-labelledby="login-heading"
        className="app-panel relative mx-auto grid w-full max-w-[90rem] overflow-hidden rounded-3xl lg:min-h-[min(48rem,calc(100vh-5rem))] lg:grid-cols-[minmax(0,1.15fr)_minmax(28rem,0.75fr)]"
      >
        <div className="flex flex-col items-start p-7 sm:p-10 lg:p-14">
          <Brand href="/login" />
          <div className="my-12 max-w-2xl lg:my-auto">
            <p className="page-kicker mb-4">AI document companion</p>
            <h1 className="page-title max-w-2xl" id="login-heading">
              Think clearly. Draft confidently.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">
              Turn early thoughts into a focused document, then refine every
              line with clear, contextual feedback.
            </p>
          </div>
          <Link
            href="/documents/new"
            className="text-link text-sm font-medium"
          >
            Start without an account →
          </Link>
        </div>

        <div className="flex items-center border-t border-[var(--border)] bg-[var(--surface-raised)] lg:border-t-0 lg:border-l">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-7 sm:p-10 lg:px-12 lg:py-14">
            <div>
              <p className="page-kicker mb-2">Welcome back</p>
              <h2 className="text-2xl font-semibold tracking-[-0.035em]">
                Sign in to continue.
              </h2>
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
            <nav
              aria-label="Legal"
              className="flex items-center justify-center gap-4 text-xs text-[var(--muted)]"
            >
              <Link className="text-link" href="/terms">
                Terms of Service
              </Link>
              <Link className="text-link" href="/privacy">
                Privacy Policy
              </Link>
            </nav>

            {isTestLoginEnabled && (
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await signIn("test-login", {
                    email: formData.get("email"),
                    name: formData.get("name"),
                    redirectTo: safeRedirectPath(formData.get("callbackUrl")),
                  });
                }}
                className="flex w-full flex-col gap-3 border-t border-[var(--border)] pt-6"
              >
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
          </div>
        </div>
      </section>
    </main>
  );
}
