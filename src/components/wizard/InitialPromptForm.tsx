"use client";

import { useSyncExternalStore } from "react";

import { InitialPromptEditor } from "@/components/wizard/InitialPromptEditor";
import {
  GUEST_DRAFT_STORAGE_KEY,
  parseStoredGuestDraft,
} from "@/lib/guestDraft";

const SERVER_SNAPSHOT = "__server__";
const EMPTY_SNAPSHOT = "__empty__";

function subscribeToGuestDraft() {
  return () => {};
}

function getGuestDraftSnapshot() {
  return window.sessionStorage.getItem(GUEST_DRAFT_STORAGE_KEY) ?? EMPTY_SNAPSHOT;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function InitialPromptForm({
  isAuthenticated,
  resumeGuestDraft,
}: {
  isAuthenticated: boolean;
  resumeGuestDraft: boolean;
}) {
  const storedValue = useSyncExternalStore(
    subscribeToGuestDraft,
    getGuestDraftSnapshot,
    getServerSnapshot,
  );

  if (storedValue === SERVER_SNAPSHOT) {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3 border-t border-[var(--border-strong)] py-10"
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent-strong)]" />
        <p className="text-sm text-[var(--muted)]">Restoring your outline…</p>
      </div>
    );
  }

  const storedDraft = parseStoredGuestDraft(
    storedValue === EMPTY_SNAPSHOT ? null : storedValue,
  );

  return (
    <InitialPromptEditor
      initialDraft={storedDraft}
      isAuthenticated={isAuthenticated}
      resumeGuestDraft={resumeGuestDraft}
    />
  );
}
