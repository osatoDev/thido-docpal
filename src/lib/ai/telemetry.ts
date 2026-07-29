import "server-only";

import { prisma } from "@/lib/prisma";
import { estimateAiCost, type AiUsageForPricing } from "@/lib/ai/pricing";

export const AI_FEATURE_LABELS = {
  DOCUMENT_FOLLOWUPS: "Planning follow-ups",
  DOCUMENT_GENERATE: "Document generation",
  COMMENT_RESPOND: "Comment responses",
} as const;

export type AiFeatureKey = keyof typeof AI_FEATURE_LABELS;

export type TrackedAnthropicMessage = {
  _request_id?: string | null;
  stop_reason?: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number | null;
    cache_read_input_tokens?: number | null;
    cache_creation?: {
      ephemeral_5m_input_tokens: number;
      ephemeral_1h_input_tokens: number;
    } | null;
    output_tokens_details?: {
      thinking_tokens: number;
    } | null;
    service_tier?: string | null;
    inference_geo?: string | null;
  };
};

type StartRecord = {
  feature: AiFeatureKey;
  status: "PENDING";
  provider: string;
  model: string;
  userId?: string;
  documentId?: string;
  commentId?: string;
  environment: string;
  startedAt: Date;
};

type CompletionRecord = {
  status: "SUCCEEDED" | "FAILED";
  completedAt: Date;
  latencyMs: number;
  firstTokenMs: number | null;
  providerRequestId: string | null;
  stopReason: string | null;
  serviceTier: string | null;
  inferenceGeo: string | null;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheCreationTokens: number;
  cacheCreation5mTokens: number;
  cacheCreation1hTokens: number;
  cacheReadTokens: number;
  estimatedCostMicroUsd: bigint | null;
  priceVersion: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type AiTelemetryStore = {
  create(data: StartRecord): Promise<{ id: string }>;
  update(id: string, data: CompletionRecord): Promise<void>;
};

const prismaTelemetryStore: AiTelemetryStore = {
  create(data) {
    return prisma.aiGeneration.create({
      data,
      select: { id: true },
    });
  },
  async update(id, data) {
    await prisma.aiGeneration.update({
      where: { id },
      data,
    });
  },
};

type Dependencies = {
  store?: AiTelemetryStore;
  now?: () => Date;
  nowMs?: () => number;
  environment?: string;
};

type StartInput = {
  feature: AiFeatureKey;
  model: string;
  userId?: string;
  documentId?: string;
  commentId?: string;
};

function extractUsage(message?: TrackedAnthropicMessage): AiUsageForPricing & {
  reasoningTokens: number;
  serviceTier: string | null;
  inferenceGeo: string | null;
} {
  const usage = message?.usage;
  const cacheCreation5mTokens =
    usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0;
  const cacheCreation1hTokens =
    usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0;

  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    reasoningTokens: usage?.output_tokens_details?.thinking_tokens ?? 0,
    cacheCreationTokens:
      usage?.cache_creation_input_tokens ??
      cacheCreation5mTokens + cacheCreation1hTokens,
    cacheCreation5mTokens,
    cacheCreation1hTokens,
    cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
    serviceTier: usage?.service_tier ?? null,
    inferenceGeo: usage?.inference_geo ?? null,
  };
}

function normalizeError(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      code: "unknown_error",
      message: String(error).slice(0, 500),
      requestId: null,
    };
  }

  const candidate = error as Error & {
    _request_id?: string;
    code?: string;
    request_id?: string;
    status?: number;
    error?: { type?: string };
  };
  const code =
    candidate.error?.type ||
    candidate.code ||
    (candidate.status ? `http_${candidate.status}` : candidate.name);

  return {
    code: code.slice(0, 120),
    message: error.message.slice(0, 500),
    requestId: candidate._request_id ?? candidate.request_id ?? null,
  };
}

function writeStructuredLog(
  level: "info" | "error",
  event: string,
  fields: Record<string, unknown>,
) {
  const message = JSON.stringify({ level, event, ...fields });
  if (level === "error") {
    console.error(message);
  } else {
    console.log(message);
  }
}

export async function startAiGeneration(
  input: StartInput,
  dependencies: Dependencies = {},
) {
  const store = dependencies.store ?? prismaTelemetryStore;
  const now = dependencies.now ?? (() => new Date());
  const nowMs = dependencies.nowMs ?? (() => performance.now());
  const environment =
    dependencies.environment ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    "unknown";
  const startedAt = now();
  const monotonicStartedAt = nowMs();

  let generation: { id: string };
  try {
    generation = await store.create({
      ...input,
      provider: "anthropic",
      status: "PENDING",
      environment,
      startedAt,
    });
  } catch (error) {
    writeStructuredLog("error", "ai_generation.telemetry_start_failed", {
      feature: input.feature,
      model: input.model,
      error: normalizeError(error).message,
    });
    throw error;
  }

  writeStructuredLog("info", "ai_generation.started", {
    generationId: generation.id,
    feature: input.feature,
    provider: "anthropic",
    model: input.model,
    environment,
  });

  let firstTokenMs: number | null = null;
  let finished = false;

  async function finish(
    status: "SUCCEEDED" | "FAILED",
    message?: TrackedAnthropicMessage,
    error?: unknown,
  ) {
    if (finished) return;
    finished = true;

    const completedAt = now();
    const latencyMs = Math.max(0, Math.round(nowMs() - monotonicStartedAt));
    const usage = extractUsage(message);
    const estimate = estimateAiCost(input.model, usage, startedAt);
    const normalizedError =
      status === "FAILED" ? normalizeError(error) : null;

    const completion: CompletionRecord = {
      status,
      completedAt,
      latencyMs,
      firstTokenMs,
      providerRequestId:
        message?._request_id ?? normalizedError?.requestId ?? null,
      stopReason: message?.stop_reason ?? null,
      serviceTier: usage.serviceTier,
      inferenceGeo: usage.inferenceGeo,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      reasoningTokens: usage.reasoningTokens,
      cacheCreationTokens: usage.cacheCreationTokens,
      cacheCreation5mTokens: usage.cacheCreation5mTokens,
      cacheCreation1hTokens: usage.cacheCreation1hTokens,
      cacheReadTokens: usage.cacheReadTokens,
      estimatedCostMicroUsd: estimate?.microUsd ?? null,
      priceVersion: estimate?.priceVersion ?? null,
      errorCode: normalizedError?.code ?? null,
      errorMessage: normalizedError?.message ?? null,
    };

    try {
      await store.update(generation.id, completion);
    } catch (telemetryError) {
      writeStructuredLog("error", "ai_generation.telemetry_update_failed", {
        generationId: generation.id,
        feature: input.feature,
        status,
        error: normalizeError(telemetryError).message,
      });
      return;
    }

    writeStructuredLog(
      status === "FAILED" ? "error" : "info",
      status === "FAILED"
        ? "ai_generation.failed"
        : "ai_generation.completed",
      {
        generationId: generation.id,
        feature: input.feature,
        provider: "anthropic",
        model: input.model,
        providerRequestId: completion.providerRequestId,
        latencyMs,
        firstTokenMs,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        cacheCreationTokens: completion.cacheCreationTokens,
        cacheReadTokens: completion.cacheReadTokens,
        estimatedCostMicroUsd:
          completion.estimatedCostMicroUsd?.toString() ?? null,
        errorCode: completion.errorCode,
      },
    );
  }

  return {
    id: generation.id,
    markFirstToken() {
      if (firstTokenMs === null && !finished) {
        firstTokenMs = Math.max(
          0,
          Math.round(nowMs() - monotonicStartedAt),
        );
      }
    },
    succeed(message: TrackedAnthropicMessage) {
      return finish("SUCCEEDED", message);
    },
    fail(error: unknown, message?: TrackedAnthropicMessage) {
      return finish("FAILED", message, error);
    },
  };
}
