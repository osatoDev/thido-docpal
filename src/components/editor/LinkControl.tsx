"use client";

import { useId, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";

import { Tooltip } from "@/components/Tooltip";
import { normalizeDocumentLink } from "@/lib/documentLinks";

export function LinkControl({
  editor,
  triggerId,
}: {
  editor: Editor;
  triggerId?: string;
}) {
  const panelId = useId();
  const linkState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      active: currentEditor.isActive("link"),
      href: String(currentEditor.getAttributes("link").href ?? ""),
    }),
  });
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function openPanel() {
    setValue(linkState.href);
    setMessage(null);
    setOpen((current) => !current);
  }

  function saveLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = normalizeDocumentLink(value);
    if (!href) {
      setMessage("Enter a valid web address or email address.");
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href, target: "_blank", rel: "noopener noreferrer" })
      .run();
    setValue(href);
    setMessage("Link saved.");
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
    setMessage(null);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(linkState.href);
      setMessage("Link copied.");
    } catch {
      setMessage("Could not copy the link.");
    }
  }

  const triggerLabel = linkState.active ? "Edit link" : "Insert link";

  return (
    <div className="relative">
      <Tooltip label={`${triggerLabel} (Ctrl/⌘ K)`} className="inline-flex shrink-0">
        <button
          id={triggerId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={triggerLabel}
          onClick={openPanel}
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-sm hover:bg-[var(--surface-subtle)] ${
            linkState.active
              ? "bg-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)] text-[var(--accent-strong)]"
              : ""
          }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4 fill-none stroke-current"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M9.5 14.5 14.5 9.5" />
            <path d="m7.75 16.25-1 1a3.18 3.18 0 0 1-4.5-4.5l3.5-3.5a3.18 3.18 0 0 1 4.5 0" />
            <path d="m16.25 7.75 1-1a3.18 3.18 0 0 1 4.5 4.5l-3.5 3.5a3.18 3.18 0 0 1-4.5 0" />
          </svg>
        </button>
      </Tooltip>
      {open ? (
        <div
          id={panelId}
          className="absolute left-0 top-full z-30 mt-2 w-80 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-lg"
        >
          <form onSubmit={saveLink} className="space-y-2">
            <label
              className="block text-xs font-semibold"
              htmlFor={`${panelId}-url`}
            >
              Web or email address
            </label>
            <input
              id={`${panelId}-url`}
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="https://example.com"
              autoFocus
              className="app-input w-full rounded-md px-2 py-1.5 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="app-button-primary px-3 py-1 text-xs"
              >
                {linkState.active ? "Update" : "Add link"}
              </button>
              {linkState.active ? (
                <>
                  <button
                    type="button"
                    className="app-button-secondary px-3 py-1 text-xs"
                    onClick={() =>
                      window.open(linkState.href, "_blank", "noopener,noreferrer")
                    }
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="app-button-secondary px-3 py-1 text-xs"
                    onClick={() => void copyLink()}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className="app-button-secondary px-3 py-1 text-xs"
                    onClick={removeLink}
                  >
                    Remove
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="app-button-secondary px-3 py-1 text-xs"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            {message ? (
              <p
                role={
                  message.includes("valid") || message.includes("Could not")
                    ? "alert"
                    : "status"
                }
                className="text-xs text-[var(--muted)]"
              >
                {message}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
