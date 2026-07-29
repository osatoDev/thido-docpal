export type AiUsageForPricing = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheCreation5mTokens: number;
  cacheCreation1hTokens: number;
  cacheReadTokens: number;
};

type ModelPrice = {
  model: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  inputUsdPerMtok: number;
  outputUsdPerMtok: number;
  cacheCreation5mUsdPerMtok: number;
  cacheCreation1hUsdPerMtok: number;
  cacheReadUsdPerMtok: number;
};

export type AiCostEstimate = {
  microUsd: bigint;
  priceVersion: string;
};

/**
 * First-party Claude API list prices. Historical rows retain the priceVersion
 * used at request time, so future changes never rewrite earlier estimates.
 */
const MODEL_PRICES: readonly ModelPrice[] = [
  {
    model: "claude-sonnet-5",
    version: "anthropic-sonnet-5-intro-2026-05-27",
    effectiveFrom: "2026-05-27T00:00:00.000Z",
    effectiveTo: "2026-09-01T00:00:00.000Z",
    inputUsdPerMtok: 2,
    outputUsdPerMtok: 10,
    cacheCreation5mUsdPerMtok: 2.5,
    cacheCreation1hUsdPerMtok: 4,
    cacheReadUsdPerMtok: 0.2,
  },
  {
    model: "claude-sonnet-5",
    version: "anthropic-sonnet-5-standard-2026-09-01",
    effectiveFrom: "2026-09-01T00:00:00.000Z",
    inputUsdPerMtok: 3,
    outputUsdPerMtok: 15,
    cacheCreation5mUsdPerMtok: 3.75,
    cacheCreation1hUsdPerMtok: 6,
    cacheReadUsdPerMtok: 0.3,
  },
  {
    model: "claude-opus-4-8",
    version: "anthropic-opus-4-8-2026-05-27",
    effectiveFrom: "2026-05-27T00:00:00.000Z",
    inputUsdPerMtok: 5,
    outputUsdPerMtok: 25,
    cacheCreation5mUsdPerMtok: 6.25,
    cacheCreation1hUsdPerMtok: 10,
    cacheReadUsdPerMtok: 0.5,
  },
  {
    model: "claude-haiku-4-5",
    version: "anthropic-haiku-4-5-2026-05-27",
    effectiveFrom: "2026-05-27T00:00:00.000Z",
    inputUsdPerMtok: 1,
    outputUsdPerMtok: 5,
    cacheCreation5mUsdPerMtok: 1.25,
    cacheCreation1hUsdPerMtok: 2,
    cacheReadUsdPerMtok: 0.1,
  },
];

function findPrice(model: string, at: Date) {
  const timestamp = at.getTime();

  return MODEL_PRICES.find((price) => {
    const starts = Date.parse(price.effectiveFrom);
    const ends = price.effectiveTo ? Date.parse(price.effectiveTo) : Infinity;
    return price.model === model && timestamp >= starts && timestamp < ends;
  });
}

export function estimateAiCost(
  model: string,
  usage: AiUsageForPricing,
  at: Date,
): AiCostEstimate | null {
  const price = findPrice(model, at);
  if (!price) return null;

  const classifiedCacheCreation =
    usage.cacheCreation5mTokens + usage.cacheCreation1hTokens;
  const unclassifiedCacheCreation = Math.max(
    0,
    usage.cacheCreationTokens - classifiedCacheCreation,
  );

  // USD-per-million-token rates are numerically equal to micro-USD per token.
  const microUsd =
    usage.inputTokens * price.inputUsdPerMtok +
    usage.outputTokens * price.outputUsdPerMtok +
    (usage.cacheCreation5mTokens + unclassifiedCacheCreation) *
      price.cacheCreation5mUsdPerMtok +
    usage.cacheCreation1hTokens * price.cacheCreation1hUsdPerMtok +
    usage.cacheReadTokens * price.cacheReadUsdPerMtok;

  return {
    microUsd: BigInt(Math.round(microUsd)),
    priceVersion: price.version,
  };
}

