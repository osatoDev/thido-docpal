"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { FeedbackMessageView } from "@/components/feedback/FeedbackConversation";

const FeedbackConversation = dynamic(() =>
  import("@/components/feedback/FeedbackConversation").then(
    (module) => module.FeedbackConversation,
  ),
);

type FeedbackConversationData = {
  initialCategory: "PROBLEM" | "IDEA" | "QUESTION" | "OTHER";
  messages: FeedbackMessageView[];
};

export function FounderFeedbackLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] =
    useState<FeedbackConversationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const loadConversation = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/feedback", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as
        | (FeedbackConversationData & { error?: string })
        | null;
      if (!response.ok || !body) {
        throw new Error(body?.error || "Could not open your conversation.");
      }
      setConversation(body);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not open your conversation.",
      );
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (pathname === "/feedback") return null;

  function closePanel() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openPanel() {
    setOpen(true);
    if (!conversation) void loadConversation();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPanel}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--muted)] shadow-sm hover:border-[var(--accent-strong)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="founder-feedback-panel"
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M5 5.5h14v10H9l-4 3v-13Z" strokeLinejoin="round" />
          <path d="M8 9h8M8 12h5" strokeLinecap="round" />
        </svg>
        Feedback
      </button>

      {open ? (
        <div className="print-hidden fixed inset-0 z-[70] flex justify-end">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close feature suggestion panel"
            className="absolute inset-0 cursor-default bg-black/25 backdrop-blur-[1px]"
            onClick={closePanel}
          />
          <aside
            id="founder-feedback-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="founder-feedback-title"
            className="relative flex h-full w-full max-w-[68rem] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--background)] shadow-2xl sm:w-[calc(100%-2rem)]"
          >
            <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
              <div>
                <p className="page-kicker mb-1">Help shape Thido</p>
                <h2 id="founder-feedback-title" className="text-xl font-semibold">
                  Suggest a feature
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closePanel}
                className="secondary-button inline-flex size-10 items-center justify-center rounded-full text-xl"
                aria-label="Close feature suggestion panel"
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {error ? (
                <div className="app-panel mx-auto max-w-xl rounded-xl p-6" role="alert">
                  <p className="font-semibold">The conversation did not load.</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadConversation()}
                    className="secondary-button mt-4 rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    Try again
                  </button>
                </div>
              ) : conversation ? (
                <FeedbackConversation
                  messages={conversation.messages}
                  initialCategory={conversation.initialCategory}
                  contextPath={pathname}
                  onRefresh={loadConversation}
                />
              ) : (
                <p className="py-16 text-center text-sm text-[var(--muted)]" role="status">
                  Opening your conversation…
                </p>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
