import { describe, expect, it } from "vitest";
import {
  isDocumentWideCommentRequest,
  partitionCommentThreads,
} from "@/lib/commentProcessing";

describe("document-wide comment processing", () => {
  it.each([
    "Rewrite the entire document in a warmer tone",
    "Make the whole draft more concise",
    "Keep this terminology consistent across the document",
    "Review the document overall",
    "Apply this document-wide",
  ])("keeps an explicit document-wide request in the foreground: %s", (body) => {
    expect(isDocumentWideCommentRequest(body)).toBe(true);
  });

  it.each([
    "Rewrite this sentence",
    "Make the whole paragraph clearer",
    "Improve this section",
    "Does this claim need a source?",
  ])("leaves a bounded comment in the background: %s", (body) => {
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
