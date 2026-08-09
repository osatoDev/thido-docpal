import { createBlankDocument } from "@/app/document-actions";
import { createSpreadsheet } from "@/app/spreadsheet-actions";
import { FounderFeedbackLauncher } from "@/components/feedback/FounderFeedbackLauncher";

export function SignedInPageActions({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) return null;

  return (
    <>
      <div className="print-hidden fixed right-5 bottom-[4.35rem] z-50 flex flex-col items-end gap-2 sm:flex-row">
        <form action={createSpreadsheet}>
          <button
            type="submit"
            className="secondary-button inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            aria-label="Start a new spreadsheet"
            title="Start a new spreadsheet"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="size-4 fill-none stroke-current"
              strokeWidth="1.5"
            >
              <path d="M3.5 3.5h13v13h-13zM3.5 8h13M8 3.5v13M12.5 3.5v13M3.5 12.5h13" />
            </svg>
            <span className="hidden sm:inline">New spreadsheet</span>
          </button>
        </form>
        <form action={createBlankDocument}>
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
      </div>
      <FounderFeedbackLauncher />
    </>
  );
}
