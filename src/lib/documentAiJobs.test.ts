import { describe, expect, it } from "vitest";

import {
  COMMENT_AI_JOB_TIMEOUT_MS,
  commentAiJobCutoff,
  isCommentAiJobActive,
} from "@/lib/documentAiJobs";

describe("document AI job locking", () => {
  const now = new Date("2026-07-31T12:00:00.000Z");

  it("keeps a recent pending AI comment active", () => {
    expect(
      isCommentAiJobActive(
        {
          aiStatus: "PENDING",
          aiStartedAt: new Date(now.getTime() - 30_000),
        },
        now,
      ),
    ).toBe(true);
  });

  it("expires abandoned jobs so a crashed worker cannot lock forever", () => {
    expect(
      isCommentAiJobActive(
        {
          aiStatus: "PENDING",
          aiStartedAt: new Date(now.getTime() - COMMENT_AI_JOB_TIMEOUT_MS - 1),
        },
        now,
      ),
    ).toBe(false);
    expect(commentAiJobCutoff(now).getTime()).toBe(
      now.getTime() - COMMENT_AI_JOB_TIMEOUT_MS,
    );
  });

  it("does not lock for completed or unstarted comment AI work", () => {
    expect(
      isCommentAiJobActive(
        { aiStatus: "SUCCEEDED", aiStartedAt: now },
        now,
      ),
    ).toBe(false);
    expect(
      isCommentAiJobActive(
        { aiStatus: "PENDING", aiStartedAt: null },
        now,
      ),
    ).toBe(false);
  });
});
