"use client";

import { useSyncExternalStore } from "react";

import { InitialPromptEditor } from "@/components/wizard/InitialPromptEditor";
import {
  GUEST_DRAFT_STORAGE_KEY,
  parseStoredGuestDraft,
} from "@/lib/guestDraft";

const EMPTY_SNAPSHOT = "__empty__";

function subscribeToGuestDraft() {
  return () => {};
}

function getGuestDraftSnapshot() {
  return window.sessionStorage.getItem(GUEST_DRAFT_STORAGE_KEY) ?? EMPTY_SNAPSHOT;
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

export function InitialPromptForm({
  isAuthenticated,
  resumeGuestDraft,
}: {
  isAuthenticated: boolean;
  resumeGuestDraft: boolean;
}) {
  const hydrated = useSyncExternalStore(
    subscribeToGuestDraft,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const storedValue = hydrated ? getGuestDraftSnapshot() : EMPTY_SNAPSHOT;

  const storedDraft = parseStoredGuestDraft(
    storedValue === EMPTY_SNAPSHOT ? null : storedValue,
  );

  return (
    <InitialPromptEditor
      key={storedValue}
      initialDraft={storedDraft}
      isAuthenticated={isAuthenticated}
      persistDraft={hydrated}
      resumeGuestDraft={resumeGuestDraft}
    />
  );
}
