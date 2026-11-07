import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getOrCreateBlankDocument: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/blankDocument", () => ({
  getOrCreateBlankDocument: mocks.getOrCreateBlankDocument,
}));

import { POST } from "@/app/api/new-document/route";

function request(kind: string, origin = "https://thido.test") {
  return new Request("https://thido.test/api/new-document", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      host: "thido.test",
      origin,
    },
    body: new URLSearchParams({ kind }),
  });
}

describe("new-document tab launcher", () => {
  beforeEach(() => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getOrCreateBlankDocument.mockResolvedValue({ id: "document-1" });
  });

  it("rejects cross-origin form submissions", async () => {
    const response = await POST(request("document", "https://attacker.test"));

    expect(response.status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("opens a blank document through a POST redirect", async () => {
    const response = await POST(request("document"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://thido.test/documents/document-1/edit",
    );
    expect(mocks.getOrCreateBlankDocument).toHaveBeenCalledWith("user-1");
  });

  it("rejects spreadsheets, which Thido no longer supports", async () => {
    const response = await POST(request("spreadsheet"));

    expect(response.status).toBe(400);
  });

  it("sends signed-out users to login in the new tab", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(request("document"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://thido.test/login?notice=sign-in-required&callbackUrl=/",
    );
  });

  it("rejects unsupported creation choices", async () => {
    const response = await POST(request("presentation"));

    expect(response.status).toBe(400);
    expect(mocks.getOrCreateBlankDocument).not.toHaveBeenCalled();
  });
});
