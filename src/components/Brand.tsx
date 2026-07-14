import Image from "next/image";
import Link from "next/link";

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="brand-lockup inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      aria-label="Thido home"
    >
      <Image
        src="/thido-docpal-mark.svg"
        alt=""
        width={36}
        height={36}
        priority
      />
      <span className="text-lg font-semibold tracking-[-0.045em]">
        Thido
      </span>
    </Link>
  );
}
