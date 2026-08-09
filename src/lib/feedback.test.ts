import { afterEach, describe, expect, it } from "vitest";

import {
  founderFeedbackRecipients,
  parseFounderInboxView,
  sanitizeFeedbackPath,
} from "@/lib/feedback";

describe("feedback helpers", () => {
  const originalFeedbackEmails = process.env.FEEDBACK_NOTIFICATION_EMAILS;
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  afterEach(() => {
    process.env.FEEDBACK_NOTIFICATION_EMAILS = originalFeedbackEmails;
    process.env.ADMIN_EMAILS = originalAdminEmails;
  });

  it("keeps safe route context while removing secrets", () => {
    expect(sanitizeFeedbackPath("/documents/doc_123/edit?panel=comments")).toBe(
      "/documents/doc_123/edit",
    );
    expect(sanitizeFeedbackPath("/share/a-secret-token")).toBe(
      "/share/[token]",
    );
    expect(sanitizeFeedbackPath("https://example.com/not-local")).toBeNull();
  });

  it("only enables the founder replies-due view for its exact query value", () => {
    expect(parseFounderInboxView("due")).toBe("due");
    expect(parseFounderInboxView(undefined)).toBe("all");
    expect(parseFounderInboxView("unknown")).toBe("all");
    expect(parseFounderInboxView(["due", "all"])).toBe("all");
  });

  it("uses and deduplicates explicitly configured recipients", () => {
    process.env.FEEDBACK_NOTIFICATION_EMAILS =
      "founder@thido.ai,FOUNDER@thido.ai,second@thido.ai";
    process.env.ADMIN_EMAILS = "admin@thido.ai";

    expect(founderFeedbackRecipients()).toEqual([
      "founder@thido.ai",
      "second@thido.ai",
    ]);
  });

  it("falls back to the admin allowlist", () => {
    delete process.env.FEEDBACK_NOTIFICATION_EMAILS;
    process.env.ADMIN_EMAILS = "admin@thido.ai";
    expect(founderFeedbackRecipients()).toEqual(["admin@thido.ai"]);
  });
});
