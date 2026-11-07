import Link from "next/link";

/** A day page with a check: one day of the plan, done. */
function ThidoMark() {
  return (
    <svg
      viewBox="0 0 48 48"
      width="30"
      height="30"
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        x="8"
        y="11"
        width="32"
        height="30"
        rx="7"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path d="M17 7v8M31 7v8" stroke="currentColor" strokeWidth="3.5" />
      <path d="M17 27l5 5 9-10" stroke="var(--accent-strong)" strokeWidth="4" />
    </svg>
  );
}

/** The wordmark: lowercase "thido" with a small sun for the dot of the i. */
function ThidoWordmark() {
  return (
    <span aria-hidden="true" className="brand-wordmark">
      th
      <span className="brand-wordmark-i">
        {"\u0131"}
        <span className="brand-wordmark-sun" />
      </span>
      do
    </span>
  );
}

export function Brand({
  href = "/",
  showWordmark = true,
}: {
  href?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      className="brand-lockup inline-flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--background)]"
      aria-label="Thido home"
    >
      <ThidoMark />
      {showWordmark && <ThidoWordmark />}
      {/*
        <span
          aria-hidden="true"
          className="inline-flex h-5 items-center rounded-full border border-[var(--border-strong)] px-1.5 font-mono text-[0.6rem] font-semibold leading-none tracking-[0.12em] text-[var(--accent-strong)] uppercase"
        >
          Beta
        </span>
      */}
    </Link>
  );
}
