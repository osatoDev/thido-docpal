import { NewDocumentMenu } from "@/components/documents/NewDocumentMenu";
import { FounderFeedbackLauncher } from "@/components/feedback/FounderFeedbackLauncher";

export function SignedInPageActions({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) return null;

  return (
    <>
      <div className="print-hidden fixed right-5 bottom-[4.35rem] z-50">
        <NewDocumentMenu compact placement="above" />
      </div>
      <FounderFeedbackLauncher />
    </>
  );
}
