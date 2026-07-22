import "server-only";

import { AuthTokenType } from "@prisma/client";

import {
  authTokenExpiry,
  createAuthToken,
  EMAIL_VERIFICATION_TTL_MS,
  hashAuthToken,
  PASSWORD_RESET_TTL_MS,
} from "@/lib/authTokens";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL: Record<AuthTokenType, number> = {
  EMAIL_VERIFICATION: EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET: PASSWORD_RESET_TTL_MS,
};

export async function issueAuthToken(userId: string, type: AuthTokenType) {
  const token = createAuthToken();

  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, type } }),
    prisma.authToken.create({
      data: {
        userId,
        type,
        tokenHash: hashAuthToken(token),
        expiresAt: authTokenExpiry(TOKEN_TTL[type]),
      },
    }),
  ]);

  return token;
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const tokenHash = hashAuthToken(token);
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const storedToken = await transaction.authToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, type: true, expiresAt: true },
    });

    if (
      !storedToken ||
      storedToken.type !== AuthTokenType.EMAIL_VERIFICATION ||
      storedToken.expiresAt <= now
    ) {
      return false;
    }

    const consumed = await transaction.authToken.deleteMany({
      where: { id: storedToken.id, expiresAt: { gt: now } },
    });
    if (consumed.count !== 1) return false;

    await transaction.user.update({
      where: { id: storedToken.userId },
      data: { emailVerified: now },
    });
    await transaction.authToken.deleteMany({
      where: {
        userId: storedToken.userId,
        type: AuthTokenType.EMAIL_VERIFICATION,
      },
    });

    return true;
  });
}

export async function resetPasswordWithToken(
  token: string,
  password: string,
): Promise<boolean> {
  const tokenHash = hashAuthToken(token);
  const passwordHash = await hashPassword(password);
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const storedToken = await transaction.authToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, type: true, expiresAt: true },
    });

    if (
      !storedToken ||
      storedToken.type !== AuthTokenType.PASSWORD_RESET ||
      storedToken.expiresAt <= now
    ) {
      return false;
    }

    const consumed = await transaction.authToken.deleteMany({
      where: { id: storedToken.id, expiresAt: { gt: now } },
    });
    if (consumed.count !== 1) return false;

    await transaction.user.update({
      where: { id: storedToken.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    });
    await transaction.authToken.deleteMany({
      where: { userId: storedToken.userId },
    });

    return true;
  });
}
