import { describe, expect, it } from "vitest";
import {
  isCommentQueuedForBatch,
  partitionCommentThreads,
} from "@/lib/commentProcessing";

describe("comment processing", () => {
  it("queues unresolved user comments that have not been actioned", () => {
    expect(
      isCommentQueuedForBatch({
        aiStatus: "NOT_REQUESTED",
        authorType: "USER",
        status: "OPEN",
        suggestion: null,
      }),
    ).toBe(true);
    expect(
      isCommentQueuedForBatch({
        aiStatus: "FAILED",
        authorType: "USER",
        status: "OPEN",
        suggestion: null,
      }),
    ).toBe(true);
  });

  it("does not requeue active, resolved, AI, or suggested comments", () => {
    const base = {
      aiStatus: "NOT_REQUESTED" as const,
      authorType: "USER" as const,
      status: "OPEN" as const,
      suggestion: null,
    };

    expect(
      isCommentQueuedForBatch({ ...base, aiStatus: "PENDING" }),
    ).toBe(false);
    expect(
      isCommentQueuedForBatch({ ...base, aiStatus: "SUCCEEDED" }),
    ).toBe(false);
    expect(
      isCommentQueuedForBatch({ ...base, status: "RESOLVED" }),
    ).toBe(false);
    expect(
      isCommentQueuedForBatch({ ...base, authorType: "AI" }),
    ).toBe(false);
    expect(
      isCommentQueuedForBatch({ ...base, suggestion: { id: "s1" } }),
    ).toBe(false);
  });

  it("moves only resolved threads into the archive", () => {
    const open = { id: "open", status: "OPEN" as const };
    const resolved = { id: "resolved", status: "RESOLVED" as const };

    expect(partitionCommentThreads([open, resolved])).toEqual({
      open: [open],
      archived: [resolved],
    });
  });
});
