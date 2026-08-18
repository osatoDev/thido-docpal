import { describe, expect, it } from "vitest";

import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/apiResponses";

describe("authorization API responses", () => {
  it("returns a structured 401 response", async () => {
    const response = await unauthorizedResponse();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Please sign in to continue.",
      },
    });
  });

  it("returns a structured 403 response", async () => {
    const response = await forbiddenResponse();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      },
    });
  });
});
