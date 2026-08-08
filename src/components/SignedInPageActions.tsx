import { createBlankDocument } from "@/app/document-actions";
import { FounderFeedbackLauncher } from "@/components/feedback/FounderFeedbackLauncher";

export function SignedInPageActions({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) return null;

  return (
    <>
      <form
        action={createBlankDocument}
        className="print-hidden fixed right-5 bottom-[4.35rem] z-50"
      >
        <button
          type="submit"
          className="primary-button inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          aria-label="Start a new blank document"
          title="Start a new blank document"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-4 fill-none stroke-current"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M10 4v12M4 10h12" />
          </svg>
          <span className="hidden sm:inline">New document</span>
        </button>
      </form>
      <FounderFeedbackLauncher />
    </>
  );
}
