"use client";

import { usePathname } from "next/navigation";

import { NewDocumentMenu } from "@/components/documents/NewDocumentMenu";

// Every other signed-in page caps its content at max-w-[90rem] and centers
// it, and this row matches that by default so "New document" lines up with
// the content edge below it. The document editor is the one deliberate
// exception: it uses the full available width and goes edge-to-edge with
// its own narrower px-2/sm:px-3/lg:px-4 inset instead. Above a 1440px-wide
// (90rem) viewport, not matching that here left "New document" sitting well
// left of the editor's own header row, which is exactly what this checks for.
const FULL_WIDTH_ROUTE = /^\/documents\/[^/]+\/edit(\/|$)/;

export function SignedInPageActions({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  if (!signedIn) return null;

  const isFullWidthPage = FULL_WIDTH_ROUTE.test(pathname ?? "");

  return (
    <div className="print-hidden w-full shrink-0">
      <div
        className={`mx-auto flex w-full items-center justify-end gap-2 pt-3 ${
          isFullWidthPage
            ? "max-w-none px-2 sm:px-3 lg:px-4"
            : "max-w-[90rem] px-5 sm:px-6 lg:px-8"
        }`}
      >
        <NewDocumentMenu compact />
      </div>
    </div>
  );
}
