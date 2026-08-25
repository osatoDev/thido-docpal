import { describe, expect, it } from "vitest";
import {
  isDocumentWideCommentRequest,
  isCommentQueuedForBatch,
  partitionCommentThreads,
} from "@/lib/commentProcessing";

describe("document-wide comment processing", () => {
  it.each([
    "Rewrite the entire document in a warmer tone",
    "Make the whole draft more concise",
    "Keep this terminology consistent across the document",
    "Review the document overall",
    "Apply this document-wide",
    "Remove all markdown from this document",
  ])("promotes an explicit document-wide request: %s", (body) => {
    expect(isDocumentWideCommentRequest(body)).toBe(true);
  });

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

  it.each([
    "Rewrite this sentence",
    "Make the whole paragraph clearer",
    "Improve this section",
    "Does this claim need a source?",
  ])("keeps a selection-target request selection-scoped: %s", (body) => {
    expect(isDocumentWideCommentRequest(body)).toBe(false);
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
