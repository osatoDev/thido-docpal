import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/Brand";
import { VerificationRequestForm } from "@/components/auth/VerificationRequestForm";
import { verifyEmailToken } from "@/lib/authTokenStore";
import { emailSchema, safeRedirectPath } from "@/lib/authInput";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string | string[];
    sent?: string | string[];
    delivery?: string | string[];
    email?: string | string[];
    callbackUrl?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const sent = (Array.isArray(params.sent) ? params.sent[0] : params.sent) === "1";
  const deliveryFailed =
    (Array.isArray(params.delivery) ? params.delivery[0] : params.delivery) ===
    "failed";
  const rawEmail = Array.isArray(params.email) ? params.email[0] : params.email;
  const parsedEmail = emailSchema.safeParse(rawEmail);
  const callbackUrl = safeRedirectPath(
    Array.isArray(params.callbackUrl)
      ? params.callbackUrl[0]
      : params.callbackUrl,
  );

  let invalidToken = false;
  let verified = false;
  if (token) {
    if (token.length < 32) {
      invalidToken = true;
    } else {
      try {
        verified = await verifyEmailToken(token);
        invalidToken = !verified;
      } catch (error) {
        console.error("Unable to verify email token", error);
        invalidToken = true;
      }
    }
  }

  if (verified) {
    redirect(
      `/login?notice=email-verified&callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6 sm:p-8">
      <section className="app-panel relative flex w-full max-w-md flex-col items-center gap-6 rounded-3xl p-7 sm:p-10">
        <Brand href="/verify-email" />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="page-kicker">Email verification</p>
          <h1 className="text-3xl font-semibold tracking-[-0.045em]">
            {invalidToken
              ? "That link is no longer valid."
              : deliveryFailed
                ? "Your account was created."
                : "Check your inbox."}
          </h1>
          <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
            {invalidToken
              ? "Verification links expire after 24 hours and can only be used once."
              : deliveryFailed
                ? "We could not deliver the first email. Request a new verification link below."
              : sent
                ? "We sent a verification link. Open it before signing in with your password."
                : "Enter your email to request a fresh verification link."}
          </p>
        </div>
        <VerificationRequestForm
          email={parsedEmail.success ? parsedEmail.data : ""}
          callbackUrl={callbackUrl}
        />
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-link text-sm font-medium"
        >
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
