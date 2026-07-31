import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const BETA_USER_LIMIT = 100;
const BETA_SEAT_LOCK_ID = 8_114_202_601;

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

export async function createBetaUser(data: Prisma.UserCreateInput) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT pg_advisory_xact_lock(${BETA_SEAT_LOCK_ID})
    `;
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
