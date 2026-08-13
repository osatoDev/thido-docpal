"use server";

import { AuthTokenType } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { issueAuthToken, resetPasswordWithToken } from "@/lib/authTokenStore";
import {
  emailSchema,
  resetPasswordSchema,
  safeRedirectPath,
} from "@/lib/authInput";
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { reportServerError } from "@/lib/rollbar/server";

export type AuthFlowState = {
  status?: "success" | "error";
  message?: string;
  errors?: { password?: string[] };
};

const RESET_REQUEST_MESSAGE =
  "If that address belongs to a password account, we sent a reset link.";
const VERIFICATION_REQUEST_MESSAGE =
  "If that address belongs to an unverified account, we sent a new verification link.";

async function clientAddress() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-real-ip") ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function requestPasswordReset(
  _state: AuthFlowState,
  formData: FormData,
): Promise<AuthFlowState> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  const address = await clientAddress();

  if (
    !parsedEmail.success ||
    !checkRateLimit(`password-reset:${address}`, 5, 60 * 60 * 1000)
  ) {
    return { status: "success", message: RESET_REQUEST_MESSAGE };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: parsedEmail.data, mode: "insensitive" } },
    select: { id: true, email: true, passwordHash: true },
  });

  if (user?.email && user.passwordHash) {
    try {
      const token = await issueAuthToken(user.id, AuthTokenType.PASSWORD_RESET);
      await sendPasswordResetEmail(user.email, token);
    } catch (error) {
      console.error("Unable to send password reset email", error);
      await reportServerError(error, {
        source: "auth-email",
        operation: "password-reset",
      });
    }
  }

  return { status: "success", message: RESET_REQUEST_MESSAGE };
}

export async function requestVerificationEmail(
  _state: AuthFlowState,
  formData: FormData,
): Promise<AuthFlowState> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  const callbackUrl = safeRedirectPath(formData.get("callbackUrl"));
  const address = await clientAddress();

  if (
    !parsedEmail.success ||
    !checkRateLimit(`verification-email:${address}`, 5, 60 * 60 * 1000)
  ) {
    return { status: "success", message: VERIFICATION_REQUEST_MESSAGE };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: parsedEmail.data, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      passwordHash: true,
    },
  });

  if (user?.email && user.passwordHash && !user.emailVerified) {
    try {
      const token = await issueAuthToken(
        user.id,
        AuthTokenType.EMAIL_VERIFICATION,
      );
      await sendVerificationEmail(user.email, token, callbackUrl);
    } catch (error) {
      console.error("Unable to send verification email", error);
      await reportServerError(error, {
        source: "auth-email",
        operation: "verification-reminder",
      });
    }
  }

  return { status: "success", message: VERIFICATION_REQUEST_MESSAGE };
}

export async function resetPassword(
  _state: AuthFlowState,
  formData: FormData,
): Promise<AuthFlowState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the form and try again.",
      errors: {
        password: parsed.error.flatten().fieldErrors.password,
      },
    };
  }

  const address = await clientAddress();
  if (!checkRateLimit(`password-reset-submit:${address}`, 10, 60 * 60 * 1000)) {
    return {
      status: "error",
      message: "Too many attempts. Request a new link and try again later.",
    };
  }

  const result = await resetPasswordWithToken(
    parsed.data.token,
    parsed.data.password,
  );
  if (!result.success) {
    return {
      status: "error",
      message: "This reset link is invalid or has expired.",
    };
  }

  if (result.email) {
    try {
      await sendPasswordChangedEmail(result.email);
    } catch (error) {
      console.error("Unable to send password-changed notification", error);
      await reportServerError(error, {
        source: "auth-email",
        operation: "password-changed-notification",
      });
    }
  }

  redirect("/login?notice=password-reset");
}
