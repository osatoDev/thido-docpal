"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { logout } from "@/app/account-actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip } from "@/components/Tooltip";
import {
  FounderFeedbackPanel,
  type FounderFeedbackPanelHandle,
} from "@/components/feedback/FounderFeedbackLauncher";
import { getUserInitials } from "@/lib/userProfile";

export type UserMenuProfile = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function UserMenu({ user }: { user: UserMenuProfile }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const feedbackPanelRef = useRef<FounderFeedbackPanelHandle>(null);
  const menuId = useId();
  const displayName = user.name?.trim() || user.email || "Thido user";
  const initials = getUserInitials(user.name, user.email);
  const showImage = Boolean(user.image) && !imageFailed;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative flex shrink-0 items-center gap-2"
    >
      <ThemeToggle />
      <Tooltip label="Account menu" placement="bottom">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-xs font-semibold text-[var(--accent-strong)] shadow-sm transition-colors hover:border-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)]"
          aria-label={`Open account menu for ${displayName}`}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
        >
          {showImage ? (
            <Image
              src={user.image!}
              alt=""
              width={36}
              height={36}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </button>
      </Tooltip>

      {open ? (
        <div
          id={menuId}
          className="absolute top-full right-0 z-50 mt-2 w-64 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] shadow-xl"
        >
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {user.email ? (
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                {user.email}
              </p>
            ) : null}
          </div>
          <div className="p-1.5 text-sm">
            <Link
              href="/plan"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-[var(--muted)]"
              >
                <rect x="4" y="5.5" width="16" height="15" rx="3.5" />
                <path d="M8.5 3.5v4M15.5 3.5v4M8.5 13.5l2.5 2.5 4.5-5" />
              </svg>
              My plan
            </Link>
            <Link
              href="/documents"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-[var(--muted)]"
              >
                <path d="M7 3.5h7l4 4v13H7z" />
                <path d="M14 3.5v4h4M10 12.5h5M10 16h5" />
              </svg>
              Older documents
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-4 w-4 text-[var(--muted)]"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.04.08h-4l-.04-.08a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.08-.04v-4L4 9.92a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.04-.08h4l.04.08a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.07.4.28.75.6 1l.08.04v4L20 14.08c-.32.25-.53.6-.6.92Z" />
              </svg>
              Settings
            </Link>
            <Link
              href="/billing"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-4 w-4 text-[var(--muted)]"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18" />
              </svg>
              Subscription
            </Link>
            {pathname !== "/feedback" ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  feedbackPanelRef.current?.open();
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className="h-4 w-4 text-[var(--muted)]"
                >
                  <path d="M5 5.5h14v10H9l-4 3v-13Z" strokeLinejoin="round" />
                  <path d="M8 9h8M8 12h5" strokeLinecap="round" />
                </svg>
                Feedback
              </button>
            ) : null}
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className="h-4 w-4 text-[var(--muted)]"
                >
                  <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
                </svg>
                Log out
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <FounderFeedbackPanel ref={feedbackPanelRef} contextPath={pathname} />
    </div>
  );
}
