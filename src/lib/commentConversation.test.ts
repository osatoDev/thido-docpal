import { describe, expect, it } from "vitest";

import { formatCommentConversation } from "@/lib/commentConversation";

describe("AI comment conversations", () => {
  it("keeps the original comment and ordered user/AI replies", () => {
    expect(
      formatCommentConversation("Is this clear?", [
        { authorType: "AI", body: "Mostly." },
        { authorType: "USER", body: "What should change?" },
      ]),
    ).toBe(
      "User: Is this clear?\n\nThido: Mostly.\n\nUser: What should change?",
    );
  });
});
