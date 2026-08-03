"use client";

import Link from "next/link";
import { useState } from "react";

export type CollaboratorPermission = "VIEW" | "COMMENT" | "EDIT" | "FULL";

export type CollaboratorSummary = {
  id: string;
  email: string;
  permission: CollaboratorPermission;
};

export type LinkAccessSummary = {
  userId: string;
  name: string | null;
  email: string | null;
  lastAccessedAt: string;
};

const permissionOptions: Array<{
  value: CollaboratorPermission;
  label: string;
}> = [
  { value: "VIEW", label: "Can view" },
  { value: "COMMENT", label: "Can comment" },
  { value: "EDIT", label: "Can edit" },
  { value: "FULL", label: "Full access" },
];

export function ShareDocumentControl({
  documentId,
  initialShareToken,
  initialSharePermission,
  initialLinkAccesses,
  initialCollaborators,
}: {
  documentId: string;
  initialShareToken: string | null;
  initialSharePermission: CollaboratorPermission;
  initialLinkAccesses: LinkAccessSummary[];
  initialCollaborators: CollaboratorSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [sharePermission, setSharePermission] =
    useState<CollaboratorPermission>(initialSharePermission);
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [email, setEmail] = useState("");
  const [permission, setPermission] =
    useState<CollaboratorPermission>("VIEW");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sharePath = shareToken ? `/share/${shareToken}` : null;

  async function inviteCollaborator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("invite");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/documents/${documentId}/collaborators`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, permission }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.collaborator) {
        throw new Error(result.error || "Could not send the invitation.");
      }
      setCollaborators((current) => {
        const withoutExisting = current.filter(
          (item) => item.id !== result.collaborator.id,
        );
        return [...withoutExisting, result.collaborator];
      });
      setEmail("");
      setMessage(`Invitation sent to ${result.collaborator.email}.`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function changePermission(
    collaborator: CollaboratorSummary,
    nextPermission: CollaboratorPermission,
  ) {
    setBusyAction(collaborator.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/documents/${documentId}/collaborators`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collaboratorId: collaborator.id,
            permission: nextPermission,
          }),
        },
      );
      if (!response.ok) throw new Error("Could not update access.");
      setCollaborators((current) =>
        current.map((item) =>
          item.id === collaborator.id
            ? { ...item, permission: nextPermission }
            : item,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function removeCollaborator(collaborator: CollaboratorSummary) {
    setBusyAction(collaborator.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/documents/${documentId}/collaborators`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collaboratorId: collaborator.id }),
        },
      );
      if (!response.ok) throw new Error("Could not remove access.");
      setCollaborators((current) =>
        current.filter((item) => item.id !== collaborator.id),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function enableLinkSharing() {
    setBusyAction("link");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: sharePermission }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.shareToken !== "string") {
        throw new Error("Could not create the share link.");
      }
      setShareToken(result.shareToken);
      setSharePermission(result.sharePermission ?? sharePermission);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function copyShareLink() {
    if (!sharePath) return;
    try {
      const shareUrl = new URL(sharePath, window.location.origin).toString();
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setError("Could not copy the link. Open it and copy the URL instead.");
    }
  }

  async function stopLinkSharing() {
    setBusyAction("link");
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not stop link sharing.");
      setShareToken(null);
      setConfirmingStop(false);
      setCopied(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="document-share-panel"
        onClick={() => {
          setOpen((current) => !current);
          setError(null);
          setMessage(null);
          setCopied(false);
          setConfirmingStop(false);
        }}
        className="secondary-button rounded-md px-3 py-1.5 text-xs font-medium"
      >
        Share
      </button>

      {open && (
        <div
          id="document-share-panel"
          className="app-panel absolute top-full right-0 z-30 mt-2 max-h-[min(42rem,calc(100vh-6rem))] w-[min(31rem,calc(100vw-2rem))] overflow-y-auto rounded-lg p-5 text-left"
        >
          <p className="text-sm font-semibold">Share this document</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Invite a specific person and choose exactly what they can do.
          </p>

          <form
            onSubmit={inviteCollaborator}
            className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]"
          >
            <label className="sr-only" htmlFor="collaborator-email">
              Email address
            </label>
            <input
              id="collaborator-email"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="app-input min-w-0 rounded-md px-3 py-2 text-xs outline-none"
            />
            <label className="sr-only" htmlFor="collaborator-permission">
              Permission
            </label>
            <select
              id="collaborator-permission"
              value={permission}
              onChange={(event) =>
                setPermission(event.target.value as CollaboratorPermission)
              }
              className="app-input rounded-md px-2 py-2 text-xs outline-none"
            >
              {permissionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busyAction !== null}
              className="primary-button rounded-md px-3 py-2 text-xs font-semibold disabled:cursor-wait disabled:opacity-50"
            >
              {busyAction === "invite" ? "Sending…" : "Invite"}
            </button>
          </form>

          {permission === "FULL" && (
            <p className="mt-2 text-xs leading-5 text-[var(--warm)]">
              Full access includes editing, deleting, and managing who else has
              access.
            </p>
          )}

          {collaborators.length > 0 && (
            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-semibold">People with access</p>
              <ul className="mt-2 flex flex-col divide-y divide-[var(--border)]">
                {collaborators.map((collaborator) => (
                  <li
                    key={collaborator.id}
                    className="flex flex-wrap items-center gap-2 py-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {collaborator.email}
                    </span>
                    <select
                      aria-label={`Permission for ${collaborator.email}`}
                      value={collaborator.permission}
                      disabled={busyAction !== null}
                      onChange={(event) =>
                        void changePermission(
                          collaborator,
                          event.target.value as CollaboratorPermission,
                        )
                      }
                      className="app-input rounded-md px-2 py-1.5 text-xs outline-none"
                    >
                      {permissionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => void removeCollaborator(collaborator)}
                      className="px-1 text-xs text-[var(--muted)] hover:text-[var(--danger)] disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <p className="text-xs font-semibold">Anyone with the link</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Anyone can view the document. Protected actions check the
              person&apos;s account when selected.
            </p>

            <label
              htmlFor="link-permission"
              className="mt-3 block text-xs font-medium text-[var(--muted)]"
            >
              Link permission
            </label>
            <select
              id="link-permission"
              value={sharePermission}
              disabled={busyAction !== null}
              onChange={(event) =>
                setSharePermission(
                  event.target.value as CollaboratorPermission,
                )
              }
              className="app-input mt-1 w-full rounded-md px-2 py-2 text-xs outline-none"
            >
              {permissionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {sharePermission === "FULL" && (
              <p className="mt-2 text-xs leading-5 text-[var(--warm)]">
                Anyone who receives this link can edit, delete, and manage
                sharing after their account is checked.
              </p>
            )}

            {initialLinkAccesses.length > 0 && (
              <div className="mt-3 rounded-md bg-[var(--surface-subtle)] p-3">
                <p className="text-xs font-semibold">Link access activity</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {initialLinkAccesses.map((access) => (
                    <li key={access.userId} className="text-xs">
                      <span className="font-medium text-[var(--foreground)]">
                        {access.name || access.email || "Thido user"}
                      </span>
                      <span className="ml-1 text-[var(--muted)]">
                        · {new Date(access.lastAccessedAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sharePath ? (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={enableLinkSharing}
                    className="secondary-button rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    {busyAction === "link" ? "Saving…" : "Save permission"}
                  </button>
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={copyShareLink}
                    className="primary-button rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <Link
                    href={sharePath}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button rounded-md px-3 py-2 text-xs font-semibold"
                  >
                    Open link
                  </Link>
                </div>
                {confirmingStop ? (
                  <div>
                    <p className="text-xs text-[var(--muted)]">
                      The existing public link will stop working immediately.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={stopLinkSharing}
                        className="text-xs font-semibold text-[var(--danger)]"
                      >
                        {busyAction === "link" ? "Stopping…" : "Stop link sharing"}
                      </button>
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => setConfirmingStop(false)}
                        className="text-xs text-[var(--muted)]"
                      >
                        Keep link
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingStop(true)}
                    className="self-start text-xs text-[var(--muted)] hover:text-[var(--danger)]"
                  >
                    Stop link sharing
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={enableLinkSharing}
                className="secondary-button mt-3 rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {busyAction === "link" ? "Creating…" : "Create link"}
              </button>
            )}
          </div>

          {message && (
            <p className="mt-3 text-xs text-[var(--accent-strong)]" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-3 text-xs text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
