import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { JSONContent } from "@tiptap/react";

import { Brand } from "@/components/Brand";
import { PublicDocumentViewer } from "@/components/documents/PublicDocumentViewer";
import { PrintDocumentButton } from "@/components/documents/PrintDocumentButton";
import { SharedDocumentActions } from "@/components/documents/SharedDocumentActions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPublicDocumentContent } from "@/lib/publicDocument";
import { isShareToken } from "@/lib/shareTokens";
import { recordDocumentAccess } from "@/lib/documentAccess";
import { documentEditPath, documentTabTitle } from "@/lib/documentUrls";

const getSharedDocument = cache((token: string) =>
  prisma.document.findFirst({
    where: { shareToken: token, status: "READY" },
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
      sharePermission: true,
      ownerId: true,
      owner: { select: { name: true } },
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const document = isShareToken(token) ? await getSharedDocument(token) : null;
  return {
    title: documentTabTitle(document?.title ?? "Shared document"),
    robots: { index: false, follow: false },
  };
}

export default async function SharedDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ action?: string | string[] }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  if (!isShareToken(token)) {
    notFound();
  }

  const document = await getSharedDocument(token);

  if (!document) {
    notFound();
  }

  recordDocumentAccess(document.id);

  const session = await auth();
  const isOwner = session?.user?.id === document.ownerId;

  const content =
    document.content && typeof document.content === "object"
      ? toPublicDocumentContent(document.content as JSONContent, token)
      : null;
  const ownerName = document.owner.name?.trim() || "the document owner";
  const attribution = isOwner ? "you" : ownerName;
  const editPath = documentEditPath(document.id, document.title);

  return (
    <main className="print-document-layout mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-5 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="print-hidden flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <Brand href="/documents/new" />
        <div className="flex flex-wrap items-center justify-end gap-3">
          {isOwner ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={editPath}
                className="secondary-button rounded-md px-3 py-2 text-xs font-semibold"
              >
                Open original
              </Link>
              <Link
                href={`${editPath}?share=1`}
                className="secondary-button rounded-md px-3 py-2 text-xs font-semibold"
              >
                Manage sharing
              </Link>
            </div>
          ) : (
            <SharedDocumentActions
              token={token}
              permission={document.sharePermission}
              initialAction={
                Array.isArray(query.action) ? query.action[0] : query.action
              }
            />
          )}
          <p className="text-xs font-medium text-[var(--muted)]">
            {isOwner ? "Public link preview" : "Shared document"}
          </p>
          <PrintDocumentButton />
        </div>
      </header>

      <article className="print-document-article mx-auto w-full max-w-4xl py-10 sm:py-14">
        <header className="print-document-heading mb-8 border-b border-[var(--border)] pb-7">
          <p className="print-hidden page-kicker mb-3">
            {isOwner ? "Previewing your shared link" : "Shared with you"}
          </p>
          <h1 className="editor-title font-serif text-3xl font-normal tracking-[-0.035em] sm:text-4xl">
            {document.title}
          </h1>
          <div className="print-hidden mt-5 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-sm font-semibold text-[var(--foreground)]"
            >
              {ownerName.charAt(0).toLocaleUpperCase()}
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                Shared by {attribution}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Last updated{" "}
                <time dateTime={document.updatedAt.toISOString()}>
                  {document.updatedAt.toLocaleDateString("en", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              </p>
            </div>
          </div>
        </header>

        <div className="print-document-panel app-panel rounded-sm py-8 sm:py-12">
          {content ? (
            <PublicDocumentViewer content={content} />
          ) : (
            <p className="text-sm text-[var(--muted)]">
              This document is empty.
            </p>
          )}
        </div>
      </article>
    </main>
  );
}
