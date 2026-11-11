"use client";

import { useEffect } from "react";

/**
 * Saves the browser's time zone when it differs from the stored one, so the
 * morning email goes out for the person's own day. Failing is harmless: the
 * next visit tries again.
 */
export function PlanTimeZoneSync({ savedTimeZone }: { savedTimeZone: string | null }) {
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone || timeZone === savedTimeZone) return;
    void fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZone }),
    }).catch(() => undefined);
  }, [savedTimeZone]);
  return null;
}
