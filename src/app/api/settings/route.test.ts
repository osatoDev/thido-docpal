import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { userSettings: { upsert: mocks.upsert } } }));
vi.mock("@/lib/rollbar/server", () => ({ reportServerError: vi.fn() }));
vi.mock("@/lib/apiResponses", () => ({
  unauthorizedResponse: () => new Response(null, { status: 401 }),
}));

import { PATCH } from "./route";

function request(value: unknown) {
  return new Request("https://thido.test/api/settings", {
    method: "PATCH",
    body: JSON.stringify({ autosaveDelaySeconds: value }),
  });
}

describe("autosave settings", () => {
  beforeEach(() => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.upsert.mockResolvedValue({ autosaveDelaySeconds: 30 });
  });

  it("persists the preference for the signed-in user", async () => {
    expect((await PATCH(request(30))).status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: { autosaveDelaySeconds: 30 },
      create: { userId: "user-1", autosaveDelaySeconds: 30 },
    });
  });

  it.each([0, -1, 1.5, 301, "30", null])("rejects invalid delay %s without writing", async value => {
    expect((await PATCH(request(value))).status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await PATCH(request(30))).status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
