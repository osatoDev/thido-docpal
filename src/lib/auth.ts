import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterUser } from "@auth/core/adapters";

import { loginSchema } from "@/lib/authInput";
import {
  createBetaUser,
  hasBetaCapacity,
} from "@/lib/betaAccess";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

// Test login lets you sign in as any email with no OAuth round-trip, purely
// for local/CI testing. Never enabled in production, even if the env var
// leaks into a prod environment by mistake — NODE_ENV is the hard backstop.
export const isTestLoginEnabled =
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_TEST_LOGIN === "true";

const adapter = PrismaAdapter(prisma);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...adapter,
    async createUser(user) {
      const created = await createBetaUser(user);
      return created as AdapterUser;
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      id: "password",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const address =
          request.headers.get("x-real-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        const { email, password } = parsed.data;
        const withinAddressLimit = checkRateLimit(
          `password-login:${address}`,
          20,
          15 * 60 * 1000,
        );
        const withinCombinationLimit = checkRateLimit(
          `password-login:${address}:${email}`,
          8,
          15 * 60 * 1000,
        );

        if (!withinAddressLimit || !withinCombinationLimit) return null;

        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        const passwordMatches = await verifyPassword(
          password,
          user?.passwordHash,
        );

        if (
          !user ||
          !passwordMatches ||
          !user.emailVerified ||
          user.betaSeat === null
        ) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified,
        };
      },
    }),
    ...(isTestLoginEnabled
      ? [
          Credentials({
            id: "test-login",
            name: "Test login",
            credentials: {
              email: { label: "Email", type: "email" },
              name: { label: "Name", type: "text" },
            },
            async authorize(credentials) {
              const email =
                typeof credentials?.email === "string"
                  ? credentials.email.trim().toLowerCase()
                  : "";
              if (!email) return null;

              const name =
                typeof credentials?.name === "string" && credentials.name.trim()
                  ? credentials.name.trim()
                  : email;

              const existingUser = await prisma.user.findUnique({
                where: { email },
              });
              const user =
                existingUser ?? (await createBetaUser({ email, name }));
              if (user.betaSeat === null) return null;

              await prisma.userSettings.upsert({
                where: { userId: user.id },
                update: {},
                create: { userId: user.id },
              });

              return user;
            },
          }),
        ]
      : []),
  ],
  // Auth.js credentials providers require JWT sessions. OAuth users continue
  // to be persisted through the Prisma adapter.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: user.email, mode: "insensitive" } },
        select: { betaSeat: true },
      });
      return existingUser
        ? existingUser.betaSeat !== null
        : hasBetaCapacity();
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const authenticatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { sessionVersion: true, betaSeat: true },
        });
        if (!authenticatedUser || authenticatedUser.betaSeat === null) {
          return null;
        }
        token.sessionVersion = authenticatedUser.sessionVersion;
        return token;
      }

      const userId =
        typeof token.id === "string"
          ? token.id
          : typeof token.sub === "string"
            ? token.sub
            : null;

      if (!userId || typeof token.sessionVersion !== "number") return null;

      try {
        const existingUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, sessionVersion: true, betaSeat: true },
        });

        if (
          !existingUser ||
          existingUser.betaSeat === null ||
          existingUser.sessionVersion !== token.sessionVersion
        ) {
          return null;
        }
        token.id = existingUser.id;
      } catch (error) {
        // A temporary database outage should not sign every user out. Keep the
        // token and let the requested operation surface the service failure.
        console.error("Unable to validate authenticated user", error);
      }

      return token;
    },
    session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? (token.id as string);
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.userSettings.create({
        data: { userId: user.id },
      });
    },
  },
});
