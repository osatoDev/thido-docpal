import "server-only";

import { prisma } from "@/lib/prisma";
import {
  AI_FEATURE_LABELS,
  type AiFeatureKey,
} from "@/lib/ai/telemetry";

type GenerationMetricRow = {
  id: string;
  feature: AiFeatureKey;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  model: string;
  startedAt: Date;
  latencyMs: number | null;
  firstTokenMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheCreationTokens: number | null;
  cacheReadTokens: number | null;
  estimatedCostMicroUsd: bigint | null;
  errorCode: string | null;
  errorMessage: string | null;
  providerRequestId: string | null;
};

export type AiFeatureMetrics = {
  feature: AiFeatureKey;
  label: string;
  calls: number;
  succeeded: number;
  failed: number;
  pending: number;
  successRate: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  p50FirstTokenMs: number | null;
  totalTokens: number;
  estimatedCostMicroUsd: bigint;
  unpricedCalls: number;
  topFailure: string | null;
};

export type AiOperationsSummary = {
  since: Date;
  totalCalls: number;
  successRate: number | null;
  totalTokens: number;
  estimatedCostMicroUsd: bigint;
  unpricedCalls: number;
  features: AiFeatureMetrics[];
  recentFailures: Array<{
    id: string;
    feature: AiFeatureKey;
    featureLabel: string;
    model: string;
    startedAt: Date;
    errorCode: string;
    errorMessage: string | null;
    providerRequestId: string | null;
  }>;
};

function percentile(values: number[], quantile: number) {
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const index = Math.max(0, Math.ceil(quantile * sorted.length) - 1);
  return sorted[index];
}

function summarizeFeature(
  feature: AiFeatureKey,
  rows: GenerationMetricRow[],
): AiFeatureMetrics {
  const succeeded = rows.filter((row) => row.status === "SUCCEEDED").length;
  const failed = rows.filter((row) => row.status === "FAILED").length;
  const pending = rows.length - succeeded - failed;
  const completed = succeeded + failed;
  const failures = new Map<string, number>();

  for (const row of rows) {
    if (row.status === "FAILED") {
      const code = row.errorCode ?? "unknown_error";
      failures.set(code, (failures.get(code) ?? 0) + 1);
    }
  }

  const topFailure =
    [...failures.entries()].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    feature,
    label: AI_FEATURE_LABELS[feature],
    calls: rows.length,
    succeeded,
    failed,
    pending,
    successRate: completed > 0 ? succeeded / completed : null,
    p50LatencyMs: percentile(
      rows.flatMap((row) => (row.latencyMs === null ? [] : [row.latencyMs])),
      0.5,
    ),
    p95LatencyMs: percentile(
      rows.flatMap((row) => (row.latencyMs === null ? [] : [row.latencyMs])),
      0.95,
    ),
    p50FirstTokenMs: percentile(
      rows.flatMap((row) =>
        row.firstTokenMs === null ? [] : [row.firstTokenMs],
      ),
      0.5,
    ),
    totalTokens: rows.reduce(
      (total, row) =>
        total +
        (row.inputTokens ?? 0) +
        (row.outputTokens ?? 0) +
        (row.cacheCreationTokens ?? 0) +
        (row.cacheReadTokens ?? 0),
      0,
    ),
    estimatedCostMicroUsd: rows.reduce(
      (total, row) => total + (row.estimatedCostMicroUsd ?? BigInt(0)),
      BigInt(0),
    ),
    unpricedCalls: rows.filter(
      (row) =>
        row.status !== "PENDING" && row.estimatedCostMicroUsd === null,
    ).length,
    topFailure,
  };
}

export function summarizeAiOperations(
  rows: GenerationMetricRow[],
  since: Date,
): AiOperationsSummary {
  const features = (Object.keys(AI_FEATURE_LABELS) as AiFeatureKey[]).map(
    (feature) =>
      summarizeFeature(
        feature,
        rows.filter((row) => row.feature === feature),
      ),
  );
  const completed = rows.filter((row) => row.status !== "PENDING");
  const succeeded = completed.filter(
    (row) => row.status === "SUCCEEDED",
  ).length;

  return {
    since,
    totalCalls: rows.length,
    successRate: completed.length > 0 ? succeeded / completed.length : null,
    totalTokens: features.reduce(
      (total, feature) => total + feature.totalTokens,
      0,
    ),
    estimatedCostMicroUsd: features.reduce(
      (total, feature) => total + feature.estimatedCostMicroUsd,
      BigInt(0),
    ),
    unpricedCalls: features.reduce(
      (total, feature) => total + feature.unpricedCalls,
      0,
    ),
    features,
    recentFailures: rows
      .filter((row) => row.status === "FAILED")
      .toSorted((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, 5)
      .map((row) => ({
        id: row.id,
        feature: row.feature,
        featureLabel: AI_FEATURE_LABELS[row.feature],
        model: row.model,
        startedAt: row.startedAt,
        errorCode: row.errorCode ?? "unknown_error",
        errorMessage: row.errorMessage,
        providerRequestId: row.providerRequestId,
      })),
  };
}

export async function getAiOperationsSummary(
  now = new Date(),
): Promise<AiOperationsSummary> {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const rows = await prisma.aiGeneration.findMany({
    where: { startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      feature: true,
      status: true,
      model: true,
      startedAt: true,
      latencyMs: true,
      firstTokenMs: true,
      inputTokens: true,
      outputTokens: true,
      cacheCreationTokens: true,
      cacheReadTokens: true,
      estimatedCostMicroUsd: true,
      errorCode: true,
      errorMessage: true,
      providerRequestId: true,
    },
  });

  return summarizeAiOperations(rows, since);
}
