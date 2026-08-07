"use client";

import { useEffect, useRef, useState } from "react";

import { HOW_IT_WORKS_STEPS } from "@/lib/howItWorks";

export function HowItWorksControl() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const step = HOW_IT_WORKS_STEPS[stepIndex];
  const lastStep = stepIndex === HOW_IT_WORKS_STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setStepIndex(0);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
        aria-haspopup="dialog"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-4 items-center justify-center rounded-full border border-[var(--border-strong)] font-serif text-[0.65rem] leading-none"
        >
          i
        </span>
        How it works
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-it-works-dialog-title"
            tabIndex={-1}
            className="app-panel w-full max-w-md overflow-hidden rounded-2xl outline-none"
          >
            <div className="relative flex min-h-48 items-end overflow-hidden border-b border-[var(--border)] bg-[var(--surface-subtle)] p-6">
              <div
                aria-hidden="true"
                className="absolute -top-16 -right-10 size-52 rounded-full border border-[var(--border-strong)] opacity-50"
              />
              <div
                aria-hidden="true"
                className="absolute top-10 right-16 size-28 rotate-12 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] shadow-sm"
              />
              <span className="relative font-mono text-xs font-semibold tracking-[0.14em] text-[var(--accent-strong)] uppercase">
                Step {stepIndex + 1} of {HOW_IT_WORKS_STEPS.length}
              </span>
              <button
                type="button"
                onClick={close}
                className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full bg-[var(--surface)] text-lg text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Close How it works"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <h2
                id="how-it-works-dialog-title"
                className="font-serif text-2xl font-semibold tracking-[-0.025em]"
              >
                {stepIndex + 1}. {step.title}
              </h2>
              <p className="mt-3 min-h-16 text-sm leading-6 text-[var(--muted)]">
                {step.description}
              </p>

              <div className="mt-6 flex items-center gap-2" aria-hidden="true">
                {HOW_IT_WORKS_STEPS.map((item, index) => (
                  <span
                    key={item.number}
                    className={`h-1.5 flex-1 rounded-full ${
                      index <= stepIndex
                        ? "bg-[var(--accent-strong)]"
                        : "bg-[var(--border)]"
                    }`}
                  />
                ))}
              </div>

              <div className="mt-5 flex gap-3">
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStepIndex((current) => current - 1)}
                    className="secondary-button rounded-md px-4 py-2.5 text-sm font-semibold"
                  >
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (lastStep) close();
                    else setStepIndex((current) => current + 1);
                  }}
                  className="primary-button flex-1 rounded-md px-4 py-2.5 text-sm font-semibold"
                >
                  {lastStep ? "Start writing" : "Next"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
