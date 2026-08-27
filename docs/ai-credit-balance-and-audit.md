# AI credit balance and usage audit

How a Thido user sees their AI credit balance and audits what their monthly
allowance was spent on.

**Status (2026-08-27):** implemented in the repository. The
`20260827120000_add_ai_credit_charge_ledger` migration still has to be applied
to the production database, and the flow should be exercised against the
deployed app (see `docs/production-todo.md`).

## 1. Where the balance is visible

**Settings → Plan and billing → "AI usage this month"**
(`src/components/settings/BillingPanel.tsx`, fed by `getAiAllowanceStatus` in
`src/lib/entitlements.ts`) shows:

- `used / limit credits` (for example `12 / 30 credits`);
- a progress bar of `used / limit`;
- **"N credits left"** and the reset date (start of the next UTC month);
- a **per-action breakdown for the current month** (action label, count, and
  credits) built from the ledger via `groupBy`;
- a **"View usage history"** link to `/settings/usage`;
- for Free beta, an "Upgrade to Pro for a higher allowance" hint;
- a hover/focus tooltip on the word "credits" explaining the action weights.

`/settings/usage` (`src/app/settings/usage/page.tsx`) lists every credit charge,
newest first, grouped by allowance month with a per-month total, each row
showing the action, timestamp, model, linked document, and credits (struck
through and tagged "refunded" when the credits were returned). It paginates
with a `?cursor=` query parameter.

When an AI action is blocked because the allowance is exhausted, the
`AiAllowanceExceededError` message (`allowanceExceededMessage`) tells the user
`"You've used this month's … AI allowance (X of Y actions). It resets on …"`.
That message is surfaced by the wizard page and the three AI API routes.

### Still open

- **Nothing near the point of use.** The dashboard, editor, and the AI action
  buttons (generate, follow-ups, action comments) show no balance and no
  "this will cost ~5 credits" hint.
- **`User.aiCreditsUsed` cross-period staleness.** The running column still
  holds the previous month's number until the first charge of the new period
  overwrites it. The meter reads correctly (`usedInCurrentPeriod` returns `0`)
  and historical totals now come from the ledger, so this is cosmetic; it
  could be removed by recomputing the column from `AiCreditCharge` on read.

## 2. Why `AiGeneration` is not the audit trail

`AiGeneration` (see `docs/ai-usage-observability.md`) already stores one row per
Anthropic call with `userId`, `feature`, `model`, token buckets, latency, and
`estimatedCostMicroUsd`. It is close, but not sufficient as a credit audit:

- It is **admin-only** and **cost/token oriented**; the pricing policy
  (`docs/paid-plan-pricing.md`) is explicit that customers should never see
  token counts or currency amounts.
- It **does not record the credit weight** that was charged.
- It is written **per provider call**. Credits are consumed once per user
  action in `checkAndConsumeAiAllowance`. Today the mapping happens to be ~1:1
  for all three features, but nothing enforces or records that link.
- Credits are consumed **before** the call and are **not refunded on failure**
  (deliberate — see the `checkAndConsumeAiAllowance` doc comment), so a `FAILED`
  `AiGeneration` row still corresponds to a real charge. Reconstructing "what
  the user was charged for" from telemetry status is indirect and lossy.

## 3. The AI credit ledger

### Data model (`prisma/schema.prisma`)

One `AiCreditCharge` row is written every time credits are consumed:

```prisma
model AiCreditCharge {
  id             String    @id @default(cuid())
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  action         AiFeature // DOCUMENT_FOLLOWUPS | DOCUMENT_GENERATE | COMMENT_RESPOND
  model          String
  credits        Int       // weight actually charged, after the premium-model multiplier
  plan           String    // "free" | "pro" at the time of the charge
  periodStart    DateTime  // the allowance period this charge counted against
  balanceAfter   Int       // User.aiCreditsUsed immediately after this charge
  documentId     String?
  document       Document? @relation(fields: [documentId], references: [id], onDelete: SetNull)
  aiGenerationId String?   @unique
  refundedAt     DateTime?
  createdAt      DateTime  @default(now())

  @@index([userId, createdAt])
  @@index([userId, periodStart])
  @@index([documentId])
}
```

It reuses the `AiFeature` enum from AI telemetry; `entitlements.ts` maps the TS
`AiActionKind` (`COMMENT_RESPOND_DOCUMENT` → `COMMENT_RESPOND`). `credits` and
`plan` are denormalised so a row stays accurate after weights or plan limits
change. `onDelete: Cascade` on `userId`: a deleted user has no balance to audit.

### Write path (`src/lib/entitlements.ts`)

- `checkAndConsumeAiAllowance(userId, kind, model, { documentId? })` writes the
  `User.aiCreditsUsed` update and the `AiCreditCharge` insert in one
  `prisma.$transaction`, and returns `chargeId` alongside
  `{ plan, limit, used, remaining }`.
- Each of the three call sites (`src/lib/ai/generateFollowups.ts`,
  `src/app/api/documents/[id]/generate/route.ts`,
  `src/app/api/documents/[id]/comments/action/route.ts`) passes `documentId`
  and, after `startAiGeneration`, calls `linkAiCreditChargeToGeneration`
  (best-effort, never throws) to record `aiGenerationId`.

### Refund path

`refundAiCreditCharge(chargeId)` stamps `refundedAt` and, when the charge
belongs to the still-current allowance period, decrements
`User.aiCreditsUsed` (never below 0). It is idempotent. **Policy:** every
failure path in the three AI routes refunds the charge, because in each case
the user receives no saved result and the queued work stays retryable — so
they should not pay for the abandoned attempt. Successful actions keep the
charge.

### Reads (`src/lib/entitlements.ts`)

- `getAiAllowanceStatus` additionally returns `breakdown` — the current
  period's charges grouped by action (`groupBy`, refunded rows excluded),
  sorted by credits.
- `getAiCreditHistory(userId, { limit, cursor })` — newest-first page of
  charges with the linked document title, plus a `nextCursor`.

### UI

- `src/components/settings/BillingPanel.tsx`: "N credits left", the
  current-month per-action breakdown, and a link to the history page.
- `src/app/settings/usage/page.tsx`: the full history, grouped by allowance
  month with per-month totals; refunded rows struck through and tagged.
  Credits only — no token or cost columns, per the pricing policy.

## 4. Still open / decided against for now

- **Point-of-use hint** near the AI buttons ("~5 credits · 18 left"). Not built.
- **Retention:** the ledger is kept indefinitely. Revisit if row volume
  warrants pruning; keep at least 13 months for annual-subscriber disputes.
- **Cost visibility:** users see credits only. The linked
  `AiGeneration.estimatedCostMicroUsd` stays admin-only.
- **Stale `aiCreditsUsed` column** (see §1). Could be recomputed from the
  ledger on read.
