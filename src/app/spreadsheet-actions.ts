"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createDefaultSpreadsheetTitle,
  createEmptySpreadsheetContent,
} from "@/lib/spreadsheet";

export async function createSpreadsheet() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/dashboard");
  }

  const spreadsheet = await prisma.spreadsheet.create({
    data: {
      ownerId: session.user.id,
      title: createDefaultSpreadsheetTitle(),
      content: createEmptySpreadsheetContent(),
    },
    select: { id: true },
  });

  redirect(`/spreadsheets/${spreadsheet.id}/edit`);
}
