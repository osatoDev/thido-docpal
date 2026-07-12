import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

// Test login lets you sign in as any email with no OAuth round-trip, purely
// for local/CI testing. Never enabled in production, even if the env var
// leaks into a prod environment by mistake — NODE_ENV is the hard backstop.
export const isTestLoginEnabled =
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_TEST_LOGIN === "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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

              const user = await prisma.user.upsert({
                where: { email },
                update: {},
                create: { email, name },
              });

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
  // Credentials sign-in is only supported with JWT sessions, so test login
  // forces the whole app onto JWT rather than database sessions.
  session: { strategy: isTestLoginEnabled ? "jwt" : "database" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
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
