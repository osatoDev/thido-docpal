"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { normalizeFolderName } from "@/lib/documentFolders";
import { prisma } from "@/lib/prisma";

function isUniqueConstraintError(reason: unknown) {
  return (
    reason instanceof Prisma.PrismaClientKnownRequestError &&
    reason.code === "P2002"
  );
}

function isValidRecordId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

export async function createDocumentFolder(folderName: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to create a folder." };
  }

  const normalized = normalizeFolderName(folderName);
  if (!normalized.ok) return normalized;

  try {
    const folder = await prisma.documentFolder.create({
      data: {
        name: normalized.name,
        nameKey: normalized.nameKey,
        ownerId: session.user.id,
      },
      select: { id: true, name: true },
    });
    revalidatePath("/dashboard");
    return { ok: true as const, folder };
  } catch (reason) {
    if (isUniqueConstraintError(reason)) {
      return {
        ok: false as const,
        error: "You already have a folder with that name.",
      };
    }
    throw reason;
  }
}

export async function renameDocumentFolder(
  folderId: string,
  folderName: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to rename this folder." };
  }
  if (!isValidRecordId(folderId)) {
    return { ok: false as const, error: "Choose a valid folder." };
  }

  const normalized = normalizeFolderName(folderName);
  if (!normalized.ok) return normalized;

  try {
    const result = await prisma.documentFolder.updateMany({
      where: { id: folderId, ownerId: session.user.id },
      data: { name: normalized.name, nameKey: normalized.nameKey },
    });
    if (result.count === 0) {
      return { ok: false as const, error: "That folder is no longer available." };
    }
    revalidatePath("/dashboard");
    return { ok: true as const, folder: { id: folderId, name: normalized.name } };
  } catch (reason) {
    if (isUniqueConstraintError(reason)) {
      return {
        ok: false as const,
        error: "You already have a folder with that name.",
      };
    }
    throw reason;
  }
}

export async function deleteDocumentFolder(folderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to delete this folder." };
  }
  if (!isValidRecordId(folderId)) {
    return { ok: false as const, error: "Choose a valid folder." };
  }

  const result = await prisma.documentFolder.deleteMany({
    where: { id: folderId, ownerId: session.user.id },
  });
  if (result.count === 0) {
    return { ok: false as const, error: "That folder is no longer available." };
  }

  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function moveDocumentToFolder(
  documentId: string,
  folderId: string | null,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to move this document." };
  }
  if (
    !isValidRecordId(documentId) ||
    (folderId !== null && !isValidRecordId(folderId))
  ) {
    return { ok: false as const, error: "Choose a valid document and folder." };
  }

  const result = await prisma.$transaction(async (transaction) => {
    if (folderId) {
      const folder = await transaction.documentFolder.findFirst({
        where: { id: folderId, ownerId: session.user.id },
        select: { id: true },
      });
      if (!folder) return { ok: false as const, error: "Choose one of your folders." };
    }

    const updated = await transaction.document.updateMany({
      where: { id: documentId, ownerId: session.user.id },
      data: { folderId },
    });
    if (updated.count === 0) {
      return { ok: false as const, error: "Only the owner can file this document." };
    }

    return { ok: true as const };
  });

  if (result.ok) revalidatePath("/dashboard");
  return result;
}
