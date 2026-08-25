import { NewDocumentMenu } from "@/components/documents/NewDocumentMenu";

export function SignedInPageActions({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) return null;

  return (
    <div className="print-hidden w-full shrink-0">
      <div className="mx-auto flex w-full max-w-[90rem] items-center justify-end gap-2 px-5 pt-3 sm:px-6 lg:px-8">
        <NewDocumentMenu compact />
      </div>
    </div>
  );
}
