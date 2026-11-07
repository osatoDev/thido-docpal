import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: (handler: unknown) => handler,
}));

import nextConfig from "../next.config";
import { config as proxyConfig } from "./proxy";

function proxyMatches(url: string) {
  return unstable_doesMiddlewareMatch({
    config: proxyConfig,
    nextConfig,
    url,
  });
}

describe("proxy route scope", () => {
  it.each([
    "/",
    "/login",
    "/privacy",
    "/api/documents",
    "/thido-docpal-mark.svg",
  ])("keeps public and route-handler requests off the auth proxy: %s", (url) => {
    expect(proxyMatches(url)).toBe(false);
  });

  it.each([
    "/admin",
    "/admin/feedback/123",
    "/documents",
    "/plan",
    "/documents/123/edit",
    "/documents/123/edit/project-plan",
    "/feedback",
    "/settings",
  ])("retains optimistic auth checks for private pages: %s", (url) => {
    expect(proxyMatches(url)).toBe(true);
  });
});
