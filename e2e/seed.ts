import { PrismaClient } from "@prisma/client";

import { DATABASE_URL, SEED } from "./constants";

const SEED_CONTENT = {
  type: "doc",
  content: [
    { type: "documentPreferences", attrs: { sideMargin: "standard" } },
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Investor update" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This quarter the team shipped the editor and the onboarding flow.",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Revenue is early but growing and the ask for the next round is unclear.",
        },
      ],
    },
  ],
};

/**
 * Resets the e2e database to a known state: one beta user and one READY
 * document they own. Safe to run repeatedly.
 */
export async function seed() {
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });
  try {
    await prisma.document.deleteMany({});
    await prisma.user.deleteMany({});

    const user = await prisma.user.create({
      data: {
        email: SEED.userEmail,
        name: SEED.userName,
        emailVerified: new Date(),
        betaSeat: 1,
        betaGrantedAt: new Date(),
        settings: { create: {} },
      },
    });

    await prisma.document.create({
      data: {
        id: SEED.documentId,
        ownerId: user.id,
        title: SEED.documentTitle,
        titleManuallySet: true,
        status: "READY",
        content: SEED_CONTENT,
        revision: 1,
        revisions: {
          create: {
            revision: 1,
            title: SEED.documentTitle,
            content: SEED_CONTENT,
            source: "INITIAL",
            actorId: user.id,
          },
        },
      },
    });

    return user;
  } finally {
    await prisma.$disconnect();
  }
}
