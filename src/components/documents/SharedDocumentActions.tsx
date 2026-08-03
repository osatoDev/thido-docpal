"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CollaboratorPermission } from "@/components/documents/ShareDocumentControl";

type SharedAction = "comment" | "edit" | "history" | "share";

const permissionActions: Record<CollaboratorPermission, SharedAction[]> = {
  VIEW: [],
  COMMENT: ["comment"],
  EDIT: ["edit", "comment", "history"],
  FULL: ["edit", "comment", "history", "share"],
};

const actionLabels: Record<SharedAction, string> = {
  comment: "Comment",
  edit: "Edit",
  history: "Version history",
  share: "Share",
};

export function SharedDocumentActions({
  token,
  permission,
  initialAction,
}: {
  token: string;
  permission: CollaboratorPermission;
  initialAction?: string;
}) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<SharedAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attemptedInitialAction = useRef(false);
  const actions = permissionActions[permission];

  const openAction = useCallback(
    async (action: SharedAction) => {
      setBusyAction(action);
      setError(null);
      try {
        const response = await fetch(`/api/share/${token}/access`, {
          method: "POST",
        });
        if (response.status === 401) {
          const callbackUrl = `/share/${token}?action=${action}`;
          router.push(
            `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
          );
          return;
        }
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.documentId !== "string") {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "This shared action is no longer available.",
          );
        }
        router.push(`/documents/${result.documentId}/edit`);
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Something went wrong.",
        );
        setBusyAction(null);
      }
    },
    [router, token],
  );

  useEffect(() => {
    if (
      !attemptedInitialAction.current &&
      initialAction &&
      actions.includes(initialAction as SharedAction) &&
      busyAction === null
    ) {
      attemptedInitialAction.current = true;
      void openAction(initialAction as SharedAction);
    }
  }, [actions, busyAction, initialAction, openAction]);

  if (actions.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            disabled={busyAction !== null}
            onClick={() => void openAction(action)}
            className="secondary-button rounded-md px-3 py-2 text-xs font-semibold disabled:cursor-wait disabled:opacity-60"
          >
            {busyAction === action ? "Opening…" : actionLabels[action]}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
