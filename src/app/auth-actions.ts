"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";

import { signIn } from "@/lib/auth";
import {
  loginSchema,
  registrationSchema,
  safeRedirectPath,
} from "@/lib/authInput";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

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
  const passwordHash = await hashPassword(password);

  try {
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });

    if (existingUser) return { message: GENERIC_REGISTRATION_ERROR };

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        settings: { create: {} },
      },
    });
  } catch {
    // Includes the unique-index race if two registrations arrive together.
    return { message: GENERIC_REGISTRATION_ERROR };
  }

  try {
    await signIn("password", {
      email,
      password,
      redirectTo: safeRedirectPath(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        message: "Your account was created. Please sign in to continue.",
      };
    }
    throw error;
  }

  return {};
}
