import Link from "next/link";

function ThidoMark() {
  return (
    <svg
      viewBox="0 0 32 32"
      width="32"
      height="32"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M5 6.5h22M11.5 6.5v19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
      <path
        d="M16 13h11M16 19h8M16 25h5"
        fill="none"
        stroke="var(--accent-strong)"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="brand-lockup inline-flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--background)]"
      aria-label="Thido home"
    >
      <ThidoMark />
      <span className="brand-wordmark">Thido</span>
    </Link>
  );
}
