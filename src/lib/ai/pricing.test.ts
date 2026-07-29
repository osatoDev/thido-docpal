import { describe, expect, it } from "vitest";
import { estimateAiCost } from "@/lib/ai/pricing";

const baseUsage = {
  inputTokens: 1_000_000,
  outputTokens: 1_000_000,
  cacheCreationTokens: 0,
  cacheCreation5mTokens: 0,
  cacheCreation1hTokens: 0,
  cacheReadTokens: 0,
};

describe("AI cost estimation", () => {
  it("uses Sonnet 5 introductory pricing through August 2026", () => {
    const estimate = estimateAiCost(
      "claude-sonnet-5",
      baseUsage,
      new Date("2026-08-31T23:59:59.999Z"),
    );

    expect(estimate).toEqual({
      microUsd: BigInt(12_000_000),
      priceVersion: "anthropic-sonnet-5-intro-2026-05-27",
    });
  });

  it("switches Sonnet 5 to standard pricing on September 1", () => {
    const estimate = estimateAiCost(
      "claude-sonnet-5",
      baseUsage,
      new Date("2026-09-01T00:00:00.000Z"),
    );

    expect(estimate).toEqual({
      microUsd: BigInt(18_000_000),
      priceVersion: "anthropic-sonnet-5-standard-2026-09-01",
    });
  });

  it("prices each cache bucket separately", () => {
    const estimate = estimateAiCost(
      "claude-haiku-4-5",
      {
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationTokens: 40,
        cacheCreation5mTokens: 10,
        cacheCreation1hTokens: 20,
        cacheReadTokens: 30,
      },
      new Date("2026-07-29T00:00:00.000Z"),
    );

    // The 10 unclassified cache-write tokens use the default five-minute rate.
    expect(estimate?.microUsd).toBe(BigInt(418));
  });

  it("returns null for an unknown model instead of inventing a price", () => {
    expect(
      estimateAiCost(
        "unknown-model",
        baseUsage,
        new Date("2026-07-29T00:00:00.000Z"),
      ),
    ).toBeNull();
  });
});
