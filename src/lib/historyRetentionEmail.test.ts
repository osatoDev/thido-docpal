import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn(), get: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = mocks; } }));
import { sendHistoryRetentionEmail, wasHistoryNoticeDelivered } from "./email";

describe("history retention email", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("AUTH_URL", "https://thido.test");
    mocks.send.mockResolvedValue({ data: { id: "mail-id" }, error: null });
  });

  it("gives a clear deadline, preservation choice, and authenticated review link", async () => {
    expect(await sendHistoryRetentionEmail({ documentId: "doc-1", documentTitle: "Draft <script>", email: "writer@example.test", name: "Writer", noticeId: "notice-1", deleteAfter: new Date("2026-10-15T12:00:00Z") })).toBe("mail-id");
    const [message, options] = mocks.send.mock.calls[0];
    expect(message.text).toContain("14-day notice period");
    expect(message.text).toContain("newest 100 versions");
    expect(message.text).toContain("Keep all versions");
    expect(message.text).toContain("https://thido.test/documents/doc-1/history");
    expect(message.html).toContain("Draft &lt;script&gt;");
    expect(message.html).not.toContain("Draft <script>");
    expect(options.headers["Idempotency-Key"]).toBe("history-retention-notice-1");
  });

  it("does not treat a missing sender as a successful preview", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(sendHistoryRetentionEmail({ documentId: "doc", documentTitle: "Draft", email: "writer@example.test", name: null, noticeId: "notice", deleteAfter: new Date() })).rejects.toThrow("configured email sender");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it.each(["queued", "sent", "bounced", "complained", "failed", "delivery_delayed", "suppressed"])("does not accept %s as delivered", async status => {
    mocks.get.mockResolvedValue({ data: { last_event: status }, error: null });
    expect(await wasHistoryNoticeDelivered("mail-id")).toBe(false);
  });

  it.each(["delivered", "opened", "clicked"])("accepts %s as evidence of delivery", async status => {
    mocks.get.mockResolvedValue({ data: { last_event: status }, error: null });
    expect(await wasHistoryNoticeDelivered("mail-id")).toBe(true);
  });
});
