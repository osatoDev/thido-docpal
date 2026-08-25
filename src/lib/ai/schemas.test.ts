import { describe, expect, it } from "vitest";

import { commentBatchResponseSchema } from "@/lib/ai/schemas";

describe("comment batch response schema", () => {
  it("accepts one document revision with a response for each comment", () => {
    expect(
      commentBatchResponseSchema.parse({
        summary: "Reworked the introduction and aligned the conclusion.",
        responses: [
          { comment_id: "comment-1", reply: "Clarified the opening claim." },
          { comment_id: "comment-2", reply: "Updated the related conclusion." },
        ],
        revised_document: "# Revised document",
      }),
    ).toMatchObject({ revised_document: "# Revised document" });
  });

  it("allows an answer-only batch without a document change", () => {
    expect(
      commentBatchResponseSchema.parse({
        summary: "Answered the review question.",
        responses: [
          { comment_id: "comment-1", reply: "The source is listed below." },
        ],
        revised_document: null,
      }).revised_document,
    ).toBeNull();
  });

  it("rejects unstructured batch output", () => {
    expect(
      commentBatchResponseSchema.safeParse({
        summary: "Done",
        revised_document: "Changed text",
      }).success,
    ).toBe(false);
  });
});
