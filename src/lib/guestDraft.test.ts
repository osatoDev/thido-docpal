import { describe, expect, it } from "vitest";

import {
  GUEST_DRAFT_MAX_AGE_MS,
  parseGuestDraft,
  parseStoredGuestDraft,
  toInitialPromptAnswers,
} from "@/lib/guestDraft";

const validDraft = {
  version: 1 as const,
  draftId: "3d6f0a20-3931-4d36-bb17-7d9c3481b403",
  savedAt: new Date().toISOString(),
  answers: {
    purpose: "Prepare a project brief",
    audience: "The delivery team",
    tone: "Direct and professional",
    keyPoints: "Scope, milestones, and risks",
    format: "A two-page brief",
  },
};

describe("guest drafts", () => {
  it("accepts a current, complete draft and creates canonical prompt answers", () => {
    const draft = parseGuestDraft(validDraft);

    expect(draft).not.toBeNull();
    expect(draft?.mode).toBe("GUIDED");
    expect(toInitialPromptAnswers(draft!)).toHaveLength(5);
    expect(toInitialPromptAnswers(draft!)[0]).toMatchObject({
      order: 1,
      answer: "Prepare a project brief",
    });
  });

  it("accepts a freeform brief as one canonical prompt answer", () => {
    const draft = parseGuestDraft({
      version: 1,
      draftId: "4d6f0a20-3931-4d36-bb17-7d9c3481b404",
      savedAt: new Date().toISOString(),
      mode: "FREEFORM",
      prompt:
        "Write a concise launch plan for a neighborhood bakery opening in September.",
    });

    expect(draft).not.toBeNull();
    expect(toInitialPromptAnswers(draft!)).toEqual([
      {
        order: 1,
        question: "What would you like Thido to draft?",
        answer:
          "Write a concise launch plan for a neighborhood bakery opening in September.",
      },
    ]);
  });

  it("rejects expired, incomplete, and malformed stored drafts", () => {
    expect(
      parseGuestDraft({
        ...validDraft,
        savedAt: new Date(Date.now() - GUEST_DRAFT_MAX_AGE_MS - 1).toISOString(),
      }),
    ).toBeNull();
    expect(
      parseGuestDraft({
        ...validDraft,
        savedAt: new Date().toISOString(),
        answers: { ...validDraft.answers, purpose: "" },
      }),
    ).toBeNull();
    expect(parseStoredGuestDraft("not json")).toBeNull();
    expect(
      parseGuestDraft({
        version: 1,
        draftId: "4d6f0a20-3931-4d36-bb17-7d9c3481b404",
        savedAt: new Date().toISOString(),
        mode: "FREEFORM",
        prompt: "   ",
      }),
    ).toBeNull();
  });
});
