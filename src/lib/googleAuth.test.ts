import { describe, expect, it } from "vitest";

import {
  hasVerifiedGoogleEmail,
  verifiedGoogleAccountLinking,
} from "@/lib/googleAuth";

describe("Google authentication", () => {
  it("accepts account linking only when Google verified the email", () => {
    expect(hasVerifiedGoogleEmail({ email_verified: true })).toBe(true);
    expect(hasVerifiedGoogleEmail({ email_verified: false })).toBe(false);
    expect(hasVerifiedGoogleEmail({ email_verified: null })).toBe(false);
    expect(hasVerifiedGoogleEmail(undefined)).toBe(false);
  });

  it("keeps same-email account linking enabled for the Google provider", () => {
    expect(verifiedGoogleAccountLinking.allowDangerousEmailAccountLinking).toBe(
      true,
    );
  });
});
