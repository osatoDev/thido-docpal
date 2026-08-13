"use server";

import { redirect } from "next/navigation";

import { auth, signIn, signOut } from "@/lib/auth";
import { registrationSchema } from "@/lib/authInput";
import { sendSignInMethodAddedEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";

export type ConnectedAccountActionState = {
  message?: string;
  success?: boolean;
};

export async function logout() {
  await signOut({ redirectTo: "/login?notice=signed-out" });
}

export async function signOutAllDevices() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/settings");
  }

  // Bumping sessionVersion invalidates every existing JWT for this user (see
  // the same mechanism used after a password reset in authTokenStore.ts),
  // including the session making this request.
  await prisma.user.update({
    where: { id: session.user.id },
    data: { sessionVersion: { increment: 1 } },
  });

  await signOut({ redirectTo: "/login?notice=signed-out-all-devices" });
}

export async function connectGoogleAccount() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/settings");
  }

  await signIn("google", {
    redirectTo: "/settings?accounts=google-linked",
  });
}

export async function addPasswordCredential(
  _state: ConnectedAccountActionState,
  formData: FormData,
): Promise<ConnectedAccountActionState> {
  const session = await auth();
  if (!session?.user?.id) return { message: "Your session has expired." };

  const password = formData.get("password");
  const confirmation = formData.get("passwordConfirmation");
  const parsed = registrationSchema.shape.password.safeParse(password);
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Choose a valid password." };
  }
  if (confirmation !== parsed.data) {
    return { message: "The passwords do not match." };
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!currentUser?.email) return { message: "This account has no email address." };
    if (currentUser.passwordHash) {
      return { message: "A password is already connected to this account." };
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        passwordHash: await hashPassword(parsed.data),
        emailVerified: new Date(),
      },
    });
    try {
      await sendSignInMethodAddedEmail(currentUser.email, "Email and password");
    } catch (error) {
      console.error("Unable to send sign-in method notification", error);
      await reportServerError(error, {
        source: "account-settings",
        operation: "notify-password-added",
      });
    }
    return { success: true, message: "Password sign-in is now connected." };
  } catch (error) {
    console.error("Unable to add password credential", error);
    await reportServerError(error, {
      source: "account-settings",
      operation: "add-password-credential",
    });
    return { message: "Could not connect password sign-in. Try again." };
  }
}
