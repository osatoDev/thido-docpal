import { describe, expect, it } from "vitest";
import { summarizeAiOperations } from "@/lib/ai/adminMetrics";

describe("AI operations summaries", () => {
  it("aggregates success, latency, tokens, cost, and failures by feature", () => {
    const since = new Date("2026-07-22T00:00:00.000Z");
    const summary = summarizeAiOperations(
      [
        {
          id: "1",
          feature: "COMMENT_RESPOND",
          status: "SUCCEEDED",
          model: "claude-sonnet-5",
          startedAt: new Date("2026-07-29T10:00:00.000Z"),
          latencyMs: 100,
          firstTokenMs: null,
          inputTokens: 40,
          outputTokens: 10,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          estimatedCostMicroUsd: BigInt(180),
          errorCode: null,
          errorMessage: null,
          providerRequestId: "req_1",
        },
        {
          id: "2",
          feature: "COMMENT_RESPOND",
          status: "FAILED",
          model: "claude-sonnet-5",
          startedAt: new Date("2026-07-29T09:00:00.000Z"),
          latencyMs: 400,
          firstTokenMs: null,
          inputTokens: 30,
          outputTokens: 5,
          cacheCreationTokens: 5,
          cacheReadTokens: 10,
          estimatedCostMicroUsd: BigInt(125),
          errorCode: "overloaded_error",
          errorMessage: "Provider overloaded",
          providerRequestId: "req_2",
        },
        {
          id: "3",
          feature: "DOCUMENT_GENERATE",
          status: "SUCCEEDED",
          model: "claude-opus-4-8",
          startedAt: new Date("2026-07-29T08:00:00.000Z"),
          latencyMs: 2_000,
          firstTokenMs: 250,
          inputTokens: 100,
          outputTokens: 500,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          estimatedCostMicroUsd: null,
          errorCode: null,
          errorMessage: null,
          providerRequestId: "req_3",
        },
      ],
      since,
    );

    expect(summary).toMatchObject({
      since,
      totalCalls: 3,
      successRate: 2 / 3,
      totalTokens: 700,
      estimatedCostMicroUsd: BigInt(305),
      unpricedCalls: 1,
    });
    expect(
      summary.features.find(
        (feature) => feature.feature === "COMMENT_RESPOND",
      ),
    ).toMatchObject({
      calls: 2,
      succeeded: 1,
      failed: 1,
      successRate: 0.5,
      p50LatencyMs: 100,
      p95LatencyMs: 400,
      totalTokens: 100,
      topFailure: "overloaded_error",
    });
    expect(
      summary.features.find(
        (feature) => feature.feature === "DOCUMENT_GENERATE",
      ),
    ).toMatchObject({
      calls: 1,
      p50FirstTokenMs: 250,
      unpricedCalls: 1,
    });
    expect(summary.recentFailures[0]).toMatchObject({
      id: "2",
      featureLabel: "Comment responses",
      errorCode: "overloaded_error",
    });
  });
});
