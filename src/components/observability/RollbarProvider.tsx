"use client";

import { Provider } from "@rollbar/react";

import { clientRollbar } from "@/lib/rollbar/client";

export function RollbarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Provider instance={clientRollbar}>{children}</Provider>;
}
