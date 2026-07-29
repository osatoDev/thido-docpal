# Tracking AI usage, latency, failures, and cost in Thido

## Recommended approach

Create one database record for every call to an AI provider, and route every
Anthropic invocation through shared tracking code. Use:

- PostgreSQL as the durable source of truth for usage and estimated cost;
- structured Vercel runtime logs for immediate debugging and correlation;
- the existing `/admin` page for operational summaries;
- an error tracker or log drain for alerts.

Vercel Web Analytics is useful for product events, but it should not be the
financial source of truth. AI usage records must be complete, server-side, and
queryable even if analytics events are sampled or unavailable.

## Features to identify

Use stable feature keys rather than route names. Thido currently has three AI
features:

| Feature key | Current call site | What it measures |
| --- | --- | --- |
| `document.followups` | `src/lib/ai/generateFollowups.ts` | Planning questions generated from the initial brief |
| `document.generate` | `src/app/api/documents/[id]/generate/route.ts` | Full streamed document generation |
| `comment.respond` | `src/app/api/documents/[id]/comments/route.ts` | AI replies and proposed edits for comments |

Keep these keys stable if routes or files move. Add a new key whenever Thido
introduces a materially different AI workflow.

## Database model

Add an `AiGeneration` record before each provider call. A practical Prisma
model would contain:

```prisma
enum AiGenerationStatus {
  PENDING
  SUCCEEDED
  FAILED
}

enum AiFeature {
  DOCUMENT_FOLLOWUPS
  DOCUMENT_GENERATE
  COMMENT_RESPOND
}

model AiGeneration {
  id         String             @id @default(cuid())
  feature    AiFeature
  status     AiGenerationStatus @default(PENDING)
  provider   String             @default("anthropic")
  model      String

  userId     String?
  documentId String?
  commentId  String?

  providerRequestId String?
  environment       String?

  startedAt    DateTime  @default(now())
  completedAt  DateTime?
  latencyMs    Int?
  firstTokenMs Int?

  inputTokens         Int?
  outputTokens        Int?
  cacheWriteTokens    Int?
  cacheReadTokens     Int?
  reasoningTokens     Int?

  estimatedCostMicroUsd BigInt?
  priceVersion          String?

  errorCode    String?
  errorMessage String?

  createdAt DateTime @default(now())

  @@index([feature, createdAt])
  @@index([status, createdAt])
  @@index([userId, createdAt])
  @@index([documentId])
  @@index([providerRequestId])
}
```

Use micro-US dollars rather than cents because a short comment response can
cost less than one cent. Keep prompt and generated text in their existing
domain records—the document, comments, replies, and suggestions—rather than
duplicating sensitive content in telemetry.

If foreign keys are added for `userId`, `documentId`, or `commentId`, decide
whether deletion should cascade or set the reference to `null`. For operational
and financial history, `onDelete: SetNull` is generally preferable.

## Shared tracking layer

Add a module such as `src/lib/ai/telemetry.ts` with two entry points:

1. `runTrackedMessage(...)` for non-streaming `messages.parse` calls.
2. `trackMessageStream(...)` for `messages.stream` calls.

Both should:

1. Create a `PENDING` record before contacting Anthropic.
2. Capture a monotonic start time with `performance.now()`.
3. Execute the provider call.
4. Read token usage and the provider request ID from the final message.
5. Calculate cost using the price version effective when the request started.
6. Update the record to `SUCCEEDED`.
7. On any exception, update it to `FAILED` before rethrowing.
8. Emit a structured JSON log containing the generation ID.

Conceptually:

```ts
const generation = await startAiGeneration({
  feature: "comment.respond",
  model,
  userId,
  documentId,
  commentId,
});

const started = performance.now();

try {
  const message = await anthropic.messages.parse(params);
  await completeAiGeneration(generation.id, {
    usage: message.usage,
    providerRequestId: message._request_id,
    latencyMs: Math.round(performance.now() - started),
  });
  return message;
} catch (error) {
  await failAiGeneration(generation.id, error, {
    latencyMs: Math.round(performance.now() - started),
  });
  throw error;
}
```

Do not make callers responsible for extracting usage or calculating cost.
They should supply only the feature and relevant resource IDs.

## Streaming document generation

`document.generate` needs slightly different handling:

- Create the telemetry row before `anthropic.messages.stream(...)`.
- Capture `firstTokenMs` when the first `text` event arrives.
- Await `claudeStream.finalMessage()` exactly once.
- Use the final message’s `usage`, `_request_id`, and `stop_reason`.
- Mark the generation successful only after the final message is received.
- If Markdown conversion or document persistence fails after a successful model
  response, keep the provider call as `SUCCEEDED` and record the application
  failure separately. The tokens were still consumed.

This distinction matters: provider success and feature success are not always
the same. If that distinction becomes useful in the dashboard, add
`outcomeStatus` or `applicationErrorCode` rather than marking a billed provider
call as failed.

## Usage fields

Anthropic returns billing usage on the final message. Store at least:

- `input_tokens`;
- `output_tokens`;
- `cache_creation_input_tokens`;
- `cache_read_input_tokens`;
- reasoning output tokens when present;
- service tier and inference geography if Thido later uses non-default options.

Anthropic documents total input usage as the sum of regular input, cache-write,
and cache-read tokens. Keep those buckets separate because they have different
prices. The SDK also exposes `_request_id`, which is valuable when reconciling a
Thido record with provider support or provider logs.

## Estimated cost

Keep a versioned server-side price table, for example
`src/lib/ai/pricing.ts`. Store rates in USD per million tokens:

```ts
type ModelPrice = {
  effectiveFrom: string;
  effectiveTo?: string;
  inputUsdPerMtok: number;
  outputUsdPerMtok: number;
  cacheWriteUsdPerMtok: number;
  cacheReadUsdPerMtok: number;
};
```

Because one million microdollars equals one US dollar, the microdollar formula
is conveniently:

```text
estimatedCostMicroUsd =
  inputTokens      × inputUsdPerMtok
  + outputTokens   × outputUsdPerMtok
  + cacheWriteTokens × cacheWriteUsdPerMtok
  + cacheReadTokens  × cacheReadUsdPerMtok
```

Round only the final result. Persist the `priceVersion` used. Never recompute
historical records with the newest price table.

As of 29 July 2026, Thido’s configured first-party Claude API models have these
standard global rates:

| Model | Effective period | Input | Output | 5-minute cache write | Cache read |
| --- | --- | ---: | ---: | ---: | ---: |
| Claude Sonnet 5 | Through 31 August 2026 | $2/MTok | $10/MTok | $2.50/MTok | $0.20/MTok |
| Claude Sonnet 5 | From 1 September 2026 | $3/MTok | $15/MTok | $3.75/MTok | $0.30/MTok |
| Claude Opus 4.8 | Current | $5/MTok | $25/MTok | $6.25/MTok | $0.50/MTok |
| Claude Haiku 4.5 | Current | $1/MTok | $5/MTok | $1.25/MTok | $0.10/MTok |

These are list-price estimates, not invoices. Contract discounts, taxes,
regional inference premiums, batch pricing, or future changes can make the
provider invoice differ. Verify the table against the
[official Anthropic pricing page](https://platform.claude.com/docs/en/about-claude/pricing)
whenever models or billing settings change.

## Structured logs

Write one completion or failure log per generation:

```json
{
  "level": "info",
  "event": "ai_generation.completed",
  "generationId": "cm...",
  "feature": "comment.respond",
  "provider": "anthropic",
  "model": "claude-sonnet-5",
  "providerRequestId": "req_...",
  "latencyMs": 1820,
  "inputTokens": 940,
  "outputTokens": 164,
  "estimatedCostMicroUsd": 3520
}
```

Failure logs should include a normalized error code, HTTP status when
available, retryability, and latency. Do not log prompts, document text, email
addresses, API keys, or raw provider response bodies.

Use the telemetry database for aggregation. Use Vercel Runtime Logs, a Log
Drain, or Sentry/Datadog for searching individual errors and alerts.

## Admin dashboard

Add an “AI operations” section to `/admin` with a selectable period and a row
per feature. Start with:

| Metric | Calculation |
| --- | --- |
| Calls | Total generation rows |
| Success rate | `SUCCEEDED / total` |
| p50 and p95 latency | Percentiles of `latencyMs` |
| p50 first-token time | Streaming records only |
| Input/output/cache tokens | Sums by token bucket |
| Estimated cost | Sum of `estimatedCostMicroUsd` |
| Cost per success | Estimated cost divided by successful feature outcomes |
| Top failure | Most frequent normalized `errorCode` |

Also show:

- daily cost for the last 30 days;
- cost by model;
- the highest-cost generations, linked to safe admin context;
- users with unusually high request volume or spend;
- provider success versus application outcome success.

Aggregate in SQL/Prisma on the server. Do not send raw per-user telemetry to a
client-side analytics service.

## Alerts

After collecting a week of baseline data, alert on:

- failure rate above 5% for a feature over 15 minutes;
- p95 latency exceeding twice its seven-day baseline;
- no successful calls for an active feature over a meaningful interval;
- daily spend exceeding the configured budget or forecast;
- a single user or document consuming an abnormal share of daily cost;
- telemetry rows remaining `PENDING` beyond the route’s maximum execution time.

The last condition catches crashed or interrupted executions. A scheduled
reconciliation job can mark stale rows as `FAILED` with
`errorCode = "generation_abandoned"`.

## Reconciliation

At least daily:

1. Compare Thido’s token and cost totals with the Anthropic Console.
2. Group both sides by day and model.
3. Investigate material variance rather than forcing the numbers to match.
4. Record the price-table version and any known discounts.

The local value should remain labelled “estimated cost.” The provider invoice
or billing export remains authoritative.

## Rollout order

1. Add the Prisma enums, `AiGeneration` model, migration, and indexes.
2. Add versioned model prices and unit tests for every configured model and
   effective-date boundary.
3. Implement non-streaming tracking and instrument `document.followups` and
   `comment.respond`.
4. Implement streaming tracking for `document.generate`, including first-token
   latency.
5. Add structured completion/failure logs.
6. Add `/admin` aggregates and filters.
7. Configure error/spend alerts and stale-generation reconciliation.
8. Compare one week of estimates against the Anthropic Console before relying
   on cost alerts.

Do not mark the production checklist item complete until all three current
features create durable records on both success and failure, cost calculations
have effective-date tests, and the production dashboard has been verified with
real calls.

## Tests worth requiring

- successful non-streaming usage persistence;
- failure persistence and rethrow;
- successful stream usage and first-token latency;
- stream/provider success followed by application failure;
- cache token pricing;
- Sonnet 5’s 1 September 2026 price boundary;
- unknown-model behavior (record usage, leave cost null, emit an alert);
- no prompt or document content in structured logs;
- admin aggregation across features, models, and dates.

