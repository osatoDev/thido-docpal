import "server-only";

import { Resend } from "resend";

import { adminDetailHref } from "@/lib/adminDetails";
import { documentEditPath } from "@/lib/documentUrls";
import { founderFeedbackRecipients } from "@/lib/feedback";

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
  idempotencyKey,
}: {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  previewUrl: string;
  idempotencyKey?: string;
}) {
  const resend = getResend();

  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    console.info(`[email preview] ${subject}: ${previewUrl}`);
    return;
  }

  const { error } = await resend.emails.send(
    {
      from: process.env.AUTH_EMAIL_FROM ?? "Thido <auth@thido.ai>",
      to,
      subject,
      text,
      html,
    },
    idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : undefined,
  );

  if (error) throw new Error(`Email delivery failed: ${error.message}`);
}

export async function sendWaitlistConfirmationEmail(email: string) {
  const url = appUrl("/login");
  await sendEmail({
    to: email,
    subject: "You’re on the Thido beta waitlist",
    text: `You’re on the Thido beta waitlist. We’ll email you as soon as your account is approved.\n\nThido: ${url}`,
    html: emailShell(
      "You’re on the waitlist",
      "The first 100 automatic beta places are full. We’ll email you as soon as the founding team reviews your request.",
      "Visit Thido",
      url,
    ),
    previewUrl: url,
    idempotencyKey: `waitlist-confirmation-${email.toLowerCase()}`,
  });
}

export async function sendWaitlistApprovedEmail({
  email,
  verificationToken,
}: {
  email: string;
  verificationToken?: string;
}) {
  const url = verificationToken
    ? appUrl(`/verify-email?token=${encodeURIComponent(verificationToken)}&callbackUrl=%2Fdashboard`)
    : appUrl("/login");
  await sendEmail({
    to: email,
    subject: "Your Thido beta account is approved",
    text: `Your Thido beta account has been approved. Continue here: ${url}`,
    html: emailShell(
      "You’re approved",
      verificationToken
        ? "Your beta account is ready. Verify your email to finish signing in."
        : "Your beta account is ready. Continue with Google using this email address.",
      verificationToken ? "Verify and continue" : "Sign in with Google",
      url,
    ),
    previewUrl: url,
    idempotencyKey: `waitlist-approved-${email.toLowerCase()}`,
  });
}

export async function sendWaitlistRejectedEmail(email: string) {
  const url = appUrl("/");
  await sendEmail({
    to: email,
    subject: "An update on your Thido beta request",
    text: `We’re unable to offer you a Thido beta place right now. You can still follow Thido here: ${url}`,
    html: emailShell(
      "Your beta request",
      "We’re unable to offer you a beta place right now. Thank you for your interest in Thido.",
      "Visit Thido",
      url,
    ),
    previewUrl: url,
    idempotencyKey: `waitlist-rejected-${email.toLowerCase()}`,
  });
}

export async function sendFounderFeedbackNotification({
  recipients,
  threadId,
  messageId,
  senderName,
  senderEmail,
  category,
  body,
  currentPath,
}: {
  recipients: string[];
  threadId: string;
  messageId: string;
  senderName: string;
  senderEmail: string;
  category: string;
  body: string;
  currentPath: string | null;
}) {
  if (recipients.length === 0) {
    throw new Error("Founder feedback notification recipients are not configured.");
  }

  const url = appUrl(`/admin/feedback/${encodeURIComponent(threadId)}`);
  const context = currentPath ? `\nPage: ${currentPath}` : "";
  const safeContext = currentPath
    ? `<span style="display:block;margin:16px 0 0;color:#646963;font-size:13px">Page: ${escapeHtml(currentPath)}</span>`
    : "";

  await sendEmail({
    to: recipients,
    subject: `${senderName} sent a message in Thido`,
    text:
      `${senderName} (${senderEmail}) sent a ${category.toLowerCase()} message:\n\n` +
      `${body}${context}\n\nOpen the conversation: ${url}`,
    html: emailShell(
      `${senderName} sent a message`,
      `<span style="display:block;white-space:pre-wrap">${escapeHtml(body)}</span>${safeContext}`,
      "Reply in Thido",
      url,
    ),
    previewUrl: url,
    idempotencyKey: `founder-feedback-${messageId}`,
  });
}

export async function sendFounderReplyEmail({
  email,
  messageId,
  body,
}: {
  email: string;
  messageId: string;
  body: string;
}) {
  const url = appUrl("/feedback");
  await sendEmail({
    to: email,
    subject: "The Thido founding team replied",
    text: `The Thido founding team replied:\n\n${body}\n\nContinue the conversation: ${url}`,
    html: emailShell(
      "The founding team replied",
      `<span style="display:block;white-space:pre-wrap">${escapeHtml(body)}</span>`,
      "Continue conversation",
      url,
    ),
    previewUrl: url,
    idempotencyKey: `founder-reply-${messageId}`,
  });
}

export async function sendAdminNewSignupNotification({
  name,
  email,
  betaSeat,
}: {
  name: string | null;
  email: string;
  betaSeat: number | null;
}) {
  const recipients = founderFeedbackRecipients();
  if (recipients.length === 0) return;

  const label = name?.trim() || email;
  const seatLabel = betaSeat ? ` (seat #${betaSeat})` : "";
  const url = appUrl(adminDetailHref("users"));

  await sendEmail({
    to: recipients,
    subject: `New Thido signup: ${label}`,
    text: `${label} (${email}) just signed up for Thido${seatLabel}.\n\nView users: ${url}`,
    html: emailShell(
      "New signup",
      `<strong>${escapeHtml(label)}</strong> (${escapeHtml(email)}) just signed up for Thido${escapeHtml(seatLabel)}.`,
      "View users",
      url,
    ),
    previewUrl: url,
    idempotencyKey: `admin-new-signup-${email.toLowerCase()}`,
  });
}

export async function sendAdminNewDocumentNotification({
  documentId,
  title,
  ownerName,
  ownerEmail,
}: {
  documentId: string;
  title: string;
  ownerName: string | null;
  ownerEmail: string;
}) {
  const recipients = founderFeedbackRecipients();
  if (recipients.length === 0) return;

  const label = ownerName?.trim() || ownerEmail;
  const url = appUrl(adminDetailHref("documents"));
  const safeLabel = escapeHtml(label);
  const safeTitle = escapeHtml(title);

  await sendEmail({
    to: recipients,
    subject: `${label} created a document`,
    text: `${label} (${ownerEmail}) created a document: "${title}".\n\nView documents: ${url}`,
    html: emailShell(
      "New document",
      `<strong>${safeLabel}</strong> (${escapeHtml(ownerEmail)}) created a document: <strong>${safeTitle}</strong>.`,
      "View documents",
      url,
    ),
    previewUrl: url,
    idempotencyKey: `admin-new-document-${documentId}`,
  });
}

const permissionDescriptions = {
  VIEW: "view the document",
  COMMENT: "view and comment on the document",
  EDIT: "edit and comment on the document",
  FULL: "edit, delete, and manage sharing for the document",
} as const;

export async function sendDocumentInvitationEmail({
  email,
  inviterName,
  documentTitle,
  documentId,
  permission,
  idempotencyKey,
}: {
  email: string;
  inviterName: string;
  documentTitle: string;
  documentId: string;
  permission: keyof typeof permissionDescriptions;
  idempotencyKey: string;
}) {
  const url = appUrl(documentEditPath(documentId, documentTitle));
  const description = permissionDescriptions[permission];
  const safeInviterName = escapeHtml(inviterName);
  const safeDocumentTitle = escapeHtml(documentTitle);

  await sendEmail({
    to: email,
    subject: `${inviterName} shared “${documentTitle}” with you`,
    text:
      `${inviterName} invited you to ${description}: “${documentTitle}”.\n\n` +
      `Open the document: ${url}\n\nSign in to Thido with ${email} to use this access.`,
    html: emailShell(
      `${inviterName} shared a document with you`,
      `${safeInviterName} invited you to ${escapeHtml(description)}: <strong>${safeDocumentTitle}</strong>. Sign in with this email address to continue.`,
      "Open document",
      url,
    ),
    previewUrl: url,
    idempotencyKey,
  });
}

export async function sendLinkAccessNotificationEmail({
  ownerEmail,
  documentId,
  documentTitle,
  accessorName,
  accessorEmail,
}: {
  ownerEmail: string;
  documentId: string;
  documentTitle: string;
  accessorName: string | null;
  accessorEmail: string | null;
}) {
  const url = appUrl(documentEditPath(documentId, documentTitle));
  const accessor =
    accessorName?.trim() || accessorEmail?.trim() || "Someone";
  const safeAccessor = escapeHtml(accessor);
  const safeDocumentTitle = escapeHtml(documentTitle);

  await sendEmail({
    to: ownerEmail,
    subject: `${accessor} used your full-access link to “${documentTitle}”`,
    text:
      `${accessor}${accessorEmail ? ` (${accessorEmail})` : ""} signed in through ` +
      `your full-access share link and can now edit, delete, and manage sharing for ` +
      `“${documentTitle}”.\n\nIf this wasn't expected, revoke the link from the document's ` +
      `share menu.\n\nOpen the document: ${url}`,
    html: emailShell(
      "A full-access link was used",
      `${safeAccessor}${accessorEmail ? ` (${escapeHtml(accessorEmail)})` : ""} signed in through your full-access share link for <strong>${safeDocumentTitle}</strong> and can now edit, delete, and manage sharing. If this wasn't expected, revoke the link from the document's share menu.`,
      "Open document",
      url,
    ),
    previewUrl: url,
    idempotencyKey: `link-access-full-${documentId}-${accessorEmail ?? accessor}`,
  });
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

export async function sendVerificationEmail(
  email: string,
  token: string,
  callbackUrl = "/",
) {
  const verificationUrl = new URL(appUrl("/verify-email"));
  verificationUrl.searchParams.set("token", token);
  verificationUrl.searchParams.set("callbackUrl", callbackUrl);
  const url = verificationUrl.toString();
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

export async function sendPasswordChangedEmail(email: string) {
  const url = appUrl("/settings");
  await sendEmail({
    to: email,
    subject: "Your Thido password was changed",
    text:
      `Your Thido account password was just changed. If you made this change, ` +
      `no action is needed.\n\nIf you did not request this, reset your password ` +
      `again immediately and review your account: ${url}`,
    html: emailShell(
      "Your password was changed",
      "Your Thido account password was just changed. If this wasn't you, reset your password again immediately and review your account.",
      "Review account",
      url,
    ),
    previewUrl: url,
  });
}

export async function sendSignInMethodAddedEmail(
  email: string,
  method: "Google" | "Email and password",
) {
  const url = appUrl("/settings");
  await sendEmail({
    to: email,
    subject: `${method} sign-in was added to your Thido account`,
    text:
      `${method} sign-in was just connected to your Thido account. If you made ` +
      `this change, no action is needed.\n\nIf you did not request this, review ` +
      `your account now: ${url}`,
    html: emailShell(
      "A new sign-in method was added",
      `${escapeHtml(method)} sign-in was just connected to your Thido account. If this wasn't you, review your account now.`,
      "Review account",
      url,
    ),
    previewUrl: url,
  });
}

export async function sendSubscriptionCancelScheduledEmail({
  email,
  subscriptionId,
  accessEndsAt,
}: {
  email: string;
  subscriptionId: string;
  accessEndsAt: Date;
}) {
  const url = appUrl("/billing");
  const dateLabel = new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(
    accessEndsAt,
  );
  await sendEmail({
    to: email,
    subject: "Your Thido Pro subscription is set to cancel",
    text:
      `Your Thido Pro subscription is scheduled to cancel. You won't be charged ` +
      `again, and you'll keep Pro access until ${dateLabel}. After that your ` +
      `account moves to the Free plan.\n\nChanged your mind? You can resume ` +
      `anytime before then: ${url}`,
    html: emailShell(
      "Your subscription is set to cancel",
      `You won't be charged again. You'll keep Pro access until <strong>${escapeHtml(dateLabel)}</strong>, then your account moves to the Free plan. Changed your mind? You can resume anytime before then.`,
      "Manage billing",
      url,
    ),
    previewUrl: url,
    idempotencyKey: `subscription-cancel-scheduled-${subscriptionId}`,
  });
}

export async function sendSubscriptionEndedEmail({
  email,
  subscriptionId,
}: {
  email: string;
  subscriptionId: string;
}) {
  const url = appUrl("/billing");
  await sendEmail({
    to: email,
    subject: "Your Thido Pro plan has ended",
    text:
      `Your Thido Pro subscription has ended and your account is now on the ` +
      `Free plan (30 AI credits a month instead of 300).\n\nYou can resubscribe ` +
      `anytime: ${url}`,
    html: emailShell(
      "Your Pro plan has ended",
      "Your Thido Pro subscription has ended and your account is now on the Free plan (30 AI credits a month instead of 300). You can resubscribe anytime.",
      "View plans",
      url,
    ),
    previewUrl: url,
    idempotencyKey: `subscription-ended-${subscriptionId}`,
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
