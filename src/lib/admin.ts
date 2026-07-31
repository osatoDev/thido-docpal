import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && adminEmails().has(email.trim().toLowerCase()));
}

export async function requireAdmin(callbackUrl = "/admin") {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/login?notice=sign-in-required&callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  }

  if (!isAdminEmail(session.user.email)) {
    redirect(`/forbidden?from=${encodeURIComponent(callbackUrl)}`);
  }

  return session;
}
