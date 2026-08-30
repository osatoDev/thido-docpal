"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";

type TooltipCoords = {
  left: number;
  top: number;
  placement: "top" | "bottom";
};

const GUTTER = 8;
const GAP = 6;

/**
 * Lightweight hover/focus tooltip. Native `title` is intentionally avoided:
 * browsers show it after an unpredictable delay and never on keyboard focus.
 *
 * Wraps a single focusable child. The bubble is portalled to `document.body`
 * and `position: fixed`, so it is never clipped by the editor's
 * `overflow-x-auto` toolbar row.
 */
export function Tooltip({
  label,
  children,
  placement = "top",
  delay = 250,
  className = "inline-flex",
}: {
  label: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
  placement?: "top" | "bottom";
  delay?: number;
  className?: string;
}) {
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const position = useCallback(() => {
    const anchor = wrapperRef.current?.firstElementChild ?? wrapperRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const preferTop = placement === "top";
    const fitsTop = rect.top >= 120;
    const useTop = preferTop ? fitsTop : rect.bottom + 120 > window.innerHeight;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, GUTTER),
      window.innerWidth - GUTTER,
    );
    setCoords({
      left,
      top: useTop ? rect.top - GAP : rect.bottom + GAP,
      placement: useTop ? "top" : "bottom",
    });
  }, [placement]);

  const show = useCallback(() => {
    clearTimer();
    timeoutRef.current = window.setTimeout(position, delay);
  }, [clearTimer, delay, position]);

  const showImmediately = useCallback(() => {
    clearTimer();
    position();
  }, [clearTimer, position]);

  const hide = useCallback(() => {
    clearTimer();
    setCoords(null);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    if (!coords) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [coords, hide]);

  if (!isValidElement(children)) return children;

  return (
    <span
      ref={wrapperRef}
      className={className}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocusCapture={showImmediately}
      onBlurCapture={hide}
    >
      {cloneElement(children, {
        "aria-describedby": coords
          ? `${children.props["aria-describedby"] ?? ""} ${tooltipId}`.trim()
          : children.props["aria-describedby"],
      })}
      {coords && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              id={tooltipId}
              className="pointer-events-none fixed z-[100] max-w-[16rem] rounded-md border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2 py-1 text-xs leading-4 font-medium text-[var(--foreground)] shadow-[var(--shadow)]"
              style={{
                left: coords.left,
                top: coords.top,
                transform:
                  coords.placement === "top"
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)",
              }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
