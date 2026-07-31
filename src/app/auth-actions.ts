"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthTokenType } from "@prisma/client";

import { signIn } from "@/lib/auth";
import {
  loginSchema,
  registrationSchema,
  safeRedirectPath,
} from "@/lib/authInput";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { reportServerError } from "@/lib/rollbar/server";
import { issueAuthToken } from "@/lib/authTokenStore";
import { sendVerificationEmail } from "@/lib/email";

export type AuthActionState = {
  message?: string;
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
};

const GENERIC_LOGIN_ERROR = "The email or password is incorrect.";
const GENERIC_REGISTRATION_ERROR =
  "We couldn't create that account. Try signing in or use another email.";

async function clientAddress(): Promise<string> {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-real-ip") ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function loginWithPassword(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { message: GENERIC_LOGIN_ERROR };

  try {
    await signIn("password", {
      ...parsed.data,
      redirectTo: safeRedirectPath(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const parsedEmail = loginSchema.shape.email.safeParse(formData.get("email"));
      const password = formData.get("password");
      if (parsedEmail.success && typeof password === "string") {
        const user = await prisma.user.findFirst({
          where: { email: { equals: parsedEmail.data, mode: "insensitive" } },
          select: { passwordHash: true, emailVerified: true },
        });
        if (
          user?.passwordHash &&
          !user.emailVerified &&
          (await verifyPassword(password, user.passwordHash))
        ) {
          return {
            message:
              "Verify your email before signing in. You can request a new link below.",
          };
        }
      }
      return { message: GENERIC_LOGIN_ERROR };
    }
    throw error;
  }

  return {};
}

export async function registerWithPassword(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registrationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const address = await clientAddress();
  if (!checkRateLimit(`password-signup:${address}`, 5, 60 * 60 * 1000)) {
    return { message: GENERIC_REGISTRATION_ERROR };
  }

  const { name, email, password } = parsed.data;
  const callbackUrl = safeRedirectPath(formData.get("callbackUrl"));
  const passwordHash = await hashPassword(password);
  let user: { id: string; email: string | null };

  try {
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });

    if (existingUser) return { message: GENERIC_REGISTRATION_ERROR };

    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        settings: { create: {} },
      },
      select: { id: true, email: true },
    });

  } catch {
    // Includes the unique-index race if two registrations arrive together.
    return { message: GENERIC_REGISTRATION_ERROR };
  }

  if (!user.email) return { message: GENERIC_REGISTRATION_ERROR };

  let deliveryFailed = false;
  try {
    const token = await issueAuthToken(
      user.id,
      AuthTokenType.EMAIL_VERIFICATION,
    );
    await sendVerificationEmail(user.email, token, callbackUrl);
  } catch (error) {
    deliveryFailed = true;
    console.error("Unable to send initial verification email", error);
    await reportServerError(error, {
      source: "auth-email",
      operation: "initial-verification",
    });
  }

  const verificationParams = new URLSearchParams({
    [deliveryFailed ? "delivery" : "sent"]: deliveryFailed ? "failed" : "1",
    email,
    callbackUrl,
  });
  redirect(`/verify-email?${verificationParams.toString()}`);
}
