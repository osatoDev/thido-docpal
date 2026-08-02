import "server-only";

import { WaitlistSignupMethod, WaitlistStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function normalizeWaitlistEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function joinWaitlist({
  email,
  name,
  signupMethod,
  passwordHash,
}: {
  email: string;
  name?: string | null;
  signupMethod: WaitlistSignupMethod;
  passwordHash?: string | null;
}) {
  const normalizedEmail = normalizeWaitlistEmail(email);

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.waitlistEntry.findUnique({
      where: { email: normalizedEmail },
    });
    const shouldStorePassword =
      signupMethod === WaitlistSignupMethod.PASSWORD && Boolean(passwordHash);

    if (!existing) {
      const entry = await transaction.waitlistEntry.create({
        data: {
          email: normalizedEmail,
          name: name?.trim() || null,
          signupMethod,
          passwordHash: shouldStorePassword ? passwordHash : null,
        },
      });
      return { entry, newlyJoined: true, accepted: true };
    }

    if (existing.status !== WaitlistStatus.PENDING) {
      return { entry: existing, newlyJoined: false, accepted: false };
    }

    const entry = await transaction.waitlistEntry.update({
      where: { id: existing.id },
      data: {
        name: name?.trim() || existing.name,
        status: WaitlistStatus.PENDING,
        reviewedAt: null,
        reviewedById: null,
        ...(shouldStorePassword
          ? {
              signupMethod: WaitlistSignupMethod.PASSWORD,
              passwordHash,
            }
          : {}),
      },
    });
    return {
      entry,
      newlyJoined: false,
      accepted: true,
    };
  });
}
