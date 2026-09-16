"use server";

import { AuthTokenType, WaitlistSignupMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import {
  betaSeatLockStatement,
  nextApprovedBetaSeat,
} from "@/lib/betaAccess";
import {
  sendAdminNewSignupNotification,
  sendWaitlistApprovedEmail,
  sendWaitlistRejectedEmail,
} from "@/lib/email";
import { issueAuthToken } from "@/lib/authTokenStore";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";

export async function approveWaitlistEntry(entryId: string) {
  const session = await requireAdmin();

  const approved = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw<Array<{ lockResult: string }>>(
      betaSeatLockStatement(),
    );
    const entry = await transaction.waitlistEntry.findFirst({
      where: { id: entryId, status: "PENDING" },
    });
    if (!entry) return null;
    if (
      entry.signupMethod === WaitlistSignupMethod.PASSWORD &&
      !entry.passwordHash
    ) {
      throw new Error("Password waitlist entry is missing its password hash.");
    }

    const claimedSeats = await transaction.user.findMany({
      where: { betaSeat: { not: null } },
      select: { betaSeat: true },
    });
    const existingUser = await transaction.user.findFirst({
      where: { email: { equals: entry.email, mode: "insensitive" } },
    });
    const betaSeat =
      existingUser?.betaSeat ??
      nextApprovedBetaSeat(
        claimedSeats.flatMap((user) =>
          user.betaSeat === null ? [] : [user.betaSeat],
        ),
      );
    const user = existingUser
      ? await transaction.user.update({
          where: { id: existingUser.id },
          data: {
            name: existingUser.name ?? entry.name,
            betaSeat,
            betaGrantedAt: existingUser.betaGrantedAt ?? new Date(),
            ...(entry.signupMethod === WaitlistSignupMethod.PASSWORD
              ? { passwordHash: existingUser.passwordHash ?? entry.passwordHash }
              : { emailVerified: existingUser.emailVerified ?? new Date() }),
          },
        })
      : await transaction.user.create({
          data: {
            email: entry.email,
            name: entry.name,
            betaSeat,
            betaGrantedAt: new Date(),
            passwordHash:
              entry.signupMethod === WaitlistSignupMethod.PASSWORD
                ? entry.passwordHash
                : null,
            emailVerified:
              entry.signupMethod === WaitlistSignupMethod.GOOGLE
                ? new Date()
                : null,
            settings: { create: {} },
          },
        });
    if (existingUser) {
      await transaction.userSettings.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
    }
    await transaction.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: session.user.id,
        approvedUserId: user.id,
        passwordHash: null,
      },
    });

    return {
      email: entry.email,
      name: user.name,
      userId: user.id,
      betaSeat: user.betaSeat,
      signupMethod: entry.signupMethod,
      isNewUser: !existingUser,
    };
  });

  if (approved) {
    try {
      const verificationToken =
        approved.signupMethod === WaitlistSignupMethod.PASSWORD
          ? await issueAuthToken(approved.userId, AuthTokenType.EMAIL_VERIFICATION)
          : undefined;
      await sendWaitlistApprovedEmail({
        email: approved.email,
        verificationToken,
      });
    } catch (error) {
      console.error("Unable to send waitlist approval email", error);
      await reportServerError(error, {
        source: "waitlist-admin",
        operation: "send-approval",
        entryId,
      });
    }

    if (approved.isNewUser) {
      try {
        await sendAdminNewSignupNotification({
          name: approved.name,
          email: approved.email,
          betaSeat: approved.betaSeat,
        });
      } catch (error) {
        console.error("Unable to send new signup notification", error);
        await reportServerError(error, {
          source: "waitlist-admin",
          operation: "notify-new-signup",
          entryId,
        });
      }
    }
  }

  revalidatePath("/admin");
}

export async function rejectWaitlistEntry(entryId: string) {
  const session = await requireAdmin();
  const rejected = await prisma.waitlistEntry.updateMany({
    where: { id: entryId, status: "PENDING" },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: session.user.id,
      passwordHash: null,
    },
  });

  if (rejected.count === 1) {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
      select: { email: true },
    });
    if (entry) {
      try {
        await sendWaitlistRejectedEmail(entry.email);
      } catch (error) {
        console.error("Unable to send waitlist rejection email", error);
        await reportServerError(error, {
          source: "waitlist-admin",
          operation: "send-rejection",
          entryId,
        });
      }
    }
  }

  revalidatePath("/admin");
}
