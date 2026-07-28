"use client";

import Link from "next/link";
import { useState } from "react";

export function DocumentNavigationLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const [navigating, setNavigating] = useState(false);

  return (
    <Link
      href={href}
      onNavigate={() => setNavigating(true)}
      aria-busy={navigating}
      data-navigating={navigating}
      className="text-[0.95rem] font-medium underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}
