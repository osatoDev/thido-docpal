import { Prisma } from "@prisma/client";

import { sendAdminNewSignupNotification } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";

export const BETA_USER_LIMIT = 100;
const BETA_SEAT_LOCK_ID = 8_114_202_601;

export function betaSeatLockStatement(lockId = BETA_SEAT_LOCK_ID) {
  return Prisma.sql`
    SELECT pg_advisory_xact_lock(${lockId})::text AS "lockResult"
  `;
}

export class BetaCapacityReachedError extends Error {
  constructor() {
    super("The free Thido beta is currently full.");
    this.name = "BetaCapacityReachedError";
  }
}

export function nextBetaSeat(claimedSeats: number[], limit = BETA_USER_LIMIT) {
  const claimed = new Set(claimedSeats);
  for (let seat = 1; seat <= limit; seat += 1) {
    if (!claimed.has(seat)) return seat;
  }
  return null;
}

/** Allocates a stable membership number for an admin-approved waitlist user. */
export function nextApprovedBetaSeat(claimedSeats: number[]) {
  return Math.max(0, ...claimedSeats) + 1;
}

export async function createBetaUser(data: Prisma.UserCreateInput) {
  const user = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw<Array<{ lockResult: string }>>(
      betaSeatLockStatement(),
    );
    const users = await transaction.user.findMany({
      where: { betaSeat: { not: null } },
      select: { betaSeat: true },
    });
    const betaSeat = nextBetaSeat(
      users.flatMap((user) =>
        user.betaSeat === null ? [] : [user.betaSeat],
      ),
    );
    if (!betaSeat) throw new BetaCapacityReachedError();

    return transaction.user.create({
      data: {
        ...data,
        betaSeat,
        betaGrantedAt: new Date(),
      },
    });
  });

  if (user.email) {
    try {
      await sendAdminNewSignupNotification({
        name: user.name,
        email: user.email,
        betaSeat: user.betaSeat,
      });
    } catch (error) {
      console.error("Unable to send new signup notification", error);
      await reportServerError(error, {
        source: "betaAccess",
        operation: "notify-new-signup",
      });
    }
  }

  return user;
}

export async function remainingBetaSeats() {
  const claimed = await prisma.user.count({
    where: { betaSeat: { not: null } },
  });
  return Math.max(0, BETA_USER_LIMIT - claimed);
}

export async function hasBetaCapacity() {
  return (await remainingBetaSeats()) > 0;
}
