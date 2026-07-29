import { describe, expect, it, vi } from "vitest";
import {
  startAiGeneration,
  type AiTelemetryStore,
  type TrackedAnthropicMessage,
} from "@/lib/ai/telemetry";

function createStore() {
  const created: unknown[] = [];
  const updated: Array<{ id: string; data: Record<string, unknown> }> = [];
  const store: AiTelemetryStore = {
    async create(data) {
      created.push(data);
      return { id: "generation-1" };
    },
    async update(id, data) {
      updated.push({ id, data });
    },
  };
  return { store, created, updated };
}

const message: TrackedAnthropicMessage = {
  _request_id: "req_123",
  stop_reason: "end_turn",
  usage: {
    input_tokens: 100,
    output_tokens: 50,
    cache_creation_input_tokens: 30,
    cache_read_input_tokens: 20,
    cache_creation: {
      ephemeral_5m_input_tokens: 10,
      ephemeral_1h_input_tokens: 20,
    },
    output_tokens_details: { thinking_tokens: 12 },
    service_tier: "standard",
    inference_geo: "global",
  },
};

describe("AI generation telemetry", () => {
  it("persists usage, first-token latency, and estimated cost on success", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { store, created, updated } = createStore();
    let milliseconds = 100;
    const tracker = await startAiGeneration(
      {
        feature: "DOCUMENT_GENERATE",
        model: "claude-sonnet-5",
        userId: "user-1",
        documentId: "document-1",
      },
      {
        store,
        environment: "test",
        now: () => new Date("2026-07-29T10:00:00.000Z"),
        nowMs: () => milliseconds,
      },
    );

    milliseconds = 145;
    tracker.markFirstToken();
    milliseconds = 310;
    await tracker.succeed(message);

    expect(created[0]).toMatchObject({
      feature: "DOCUMENT_GENERATE",
      status: "PENDING",
      provider: "anthropic",
      environment: "test",
    });
    expect(updated[0]).toMatchObject({
      id: "generation-1",
      data: {
        status: "SUCCEEDED",
        latencyMs: 210,
        firstTokenMs: 45,
        providerRequestId: "req_123",
        inputTokens: 100,
        outputTokens: 50,
        reasoningTokens: 12,
        estimatedCostMicroUsd: BigInt(809),
        priceVersion: "anthropic-sonnet-5-intro-2026-05-27",
      },
    });
  });

  it("persists a failed feature with billed usage when post-processing fails", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { store, updated } = createStore();
    let milliseconds = 0;
    const tracker = await startAiGeneration(
      {
        feature: "COMMENT_RESPOND",
        model: "claude-haiku-4-5",
        commentId: "comment-1",
      },
      {
        store,
        now: () => new Date("2026-07-29T10:00:00.000Z"),
        nowMs: () => milliseconds,
      },
    );

    milliseconds = 80;
    const error = Object.assign(new Error("Could not save reply"), {
      request_id: "req_failure",
    });
    await tracker.fail(error);

    expect(updated[0]).toMatchObject({
      data: {
        status: "FAILED",
        latencyMs: 80,
        providerRequestId: "req_failure",
        inputTokens: 0,
        outputTokens: 0,
        errorCode: "Error",
        errorMessage: "Could not save reply",
      },
    });
  });
});
