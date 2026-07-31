import { describe, expect, it } from "vitest";

import {
  sanitizeRollbarString,
  sanitizeRollbarValue,
} from "@/lib/rollbar/sanitize";

describe("Rollbar payload sanitization", () => {
  it("replaces private route identifiers and query secrets", () => {
    expect(
      sanitizeRollbarString(
        "https://thido.ai/share/private-token?email=user@example.com&token=abc",
      ),
    ).toBe(
      "https://thido.ai/share/[token]?email=[redacted]&token=[redacted]",
    );
    expect(
      sanitizeRollbarString("/api/documents/doc-123/comments"),
    ).toBe("/api/documents/[id]/comments");
  });

  it("redacts content-bearing and identity fields recursively", () => {
    expect(
      sanitizeRollbarValue({
        route: "/documents/doc-123/edit",
        email: "user@example.com",
        nested: {
          documentContent: "Private draft",
          providerRequestId: "req_123",
        },
      }),
    ).toEqual({
      route: "/documents/[id]/edit",
      email: "[redacted]",
      nested: {
        documentContent: "[redacted]",
        providerRequestId: "req_123",
      },
    });
  });
});
