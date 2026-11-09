"use client";

import { useEffect, useRef } from "react";

/** How often a visible editor asks the server whether another browser saved. */
export const REMOTE_EDIT_POLL_MS = 5_000;

type RemoteEditWatch = {
  documentId: string;
  enabled: boolean;
  /** The revision this editor last loaded or saved. */
  getLocalRevision: () => number;
  /** Bumped each time this editor sends a save; a save in flight hides the result. */
  getSaveCount: () => number;
  isSaving: () => boolean;
  onNewerRevision: (revision: number) => void;
};

function channelName(documentId: string) {
  return `thido-document-${documentId}`;
}

/** Tells other tabs in this browser about a save, so they stop at once. */
export function announceSavedRevision(documentId: string, revision: number) {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(channelName(documentId));
    channel.postMessage({ revision });
    channel.close();
  } catch {
    // Other tabs still find out from polling.
  }
}

/**
 * Notices when the document was saved somewhere else: right away from other
 * tabs in this browser, and from other browsers by polling while visible and
 * when the tab regains focus.
 */
export function useRemoteEditWatch(watch: RemoteEditWatch) {
  const latest = useRef(watch);
  useEffect(() => {
    latest.current = watch;
  });

  const { documentId, enabled } = watch;
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let checking = false;

    const report = (revision: unknown) => {
      const current = latest.current;
      if (stopped || typeof revision !== "number" || current.isSaving()) return;
      if (revision > current.getLocalRevision()) current.onNewerRevision(revision);
    };

    const check = async () => {
      if (checking || document.visibilityState !== "visible") return;
      const current = latest.current;
      if (current.isSaving()) return;
      checking = true;
      const saveCount = current.getSaveCount();
      try {
        const response = await fetch(`/api/documents/${documentId}/latest-revision`, { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json().catch(() => null)) as { revision?: unknown } | null;
        // Our own save may have landed while this was in flight.
        if (latest.current.getSaveCount() !== saveCount) return;
        report(body?.revision);
      } catch {
        // Offline or blocked: try again on the next tick.
      } finally {
        checking = false;
      }
    };

    const interval = window.setInterval(() => void check(), REMOTE_EDIT_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(channelName(documentId));
        channel.onmessage = (event: MessageEvent<{ revision?: unknown }>) => report(event.data?.revision);
      } catch {
        channel = null;
      }
    }

    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      channel?.close();
    };
  }, [documentId, enabled]);
}
