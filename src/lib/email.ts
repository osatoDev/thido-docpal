import "server-only";

import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  resendClient ??= new Resend(apiKey);
  return resendClient;
}

function appUrl(path: string) {
  const configuredUrl =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");

  return new URL(path, configuredUrl).toString();
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character]!,
  );
}

async function sendEmail({
  to,
  subject,
  text,
  html,
  previewUrl,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
  previewUrl: string;
}) {
  const resend = getResend();

  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    console.info(`[auth email preview] ${subject}: ${previewUrl}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.AUTH_EMAIL_FROM ?? "Thido <onboarding@resend.dev>",
    to,
    subject,
    text,
    html,
  });

  if (error) throw new Error(`Email delivery failed: ${error.message}`);
}

function emailShell(title: string, body: string, action: string, url: string) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f2ed;color:#222622;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:48px 24px">
      <p style="margin:0 0 28px;font-family:Georgia,serif;font-size:26px;font-weight:700">Thido</p>
      <div style="border:1px solid #d8d5ce;background:#fff;padding:32px">
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:500">${escapeHtml(title)}</h1>
        <p style="margin:0 0 28px;color:#646963;font-size:15px;line-height:1.6">${body}</p>
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#222622;color:#fff;padding:12px 18px;text-decoration:none;font-size:14px;font-weight:600">${escapeHtml(action)}</a>
      </div>
      <p style="margin:20px 0 0;color:#8c918b;font-size:12px;line-height:1.5">If you did not request this, you can ignore this email.</p>
    </div>
  </body>
</html>`;
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  await sendEmail({
    to: email,
    subject: "Verify your Thido email",
    text: `Verify your Thido email by opening this link: ${url}\n\nThis link expires in 24 hours.`,
    html: emailShell(
      "Verify your email",
      "Confirm this address to finish creating your account. This link expires in 24 hours.",
      "Verify email",
      url,
    ),
    previewUrl: url,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  await sendEmail({
    to: email,
    subject: "Reset your Thido password",
    text: `Reset your Thido password by opening this link: ${url}\n\nThis link expires in one hour.`,
    html: emailShell(
      "Reset your password",
      "Choose a new password for your account. This link expires in one hour and can only be used once.",
      "Reset password",
      url,
    ),
    previewUrl: url,
  });
}
