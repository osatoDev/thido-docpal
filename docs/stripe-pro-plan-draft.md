# Thido Pro — Stripe product & price draft

Status: **created in the `stripe-cobalt-harbor` sandbox on 2026-08-27** with the
recommended options (€12/month, EUR, monthly only, no trial). Still not a
published or live price. The founder subsequently approved exposing this sandbox
Price in Production as a test-mode preview (see the
[checkout decision](./stripe-production-checkout-decision.md)). Live-payment
requirements remain in the [billing launch checklist](./production-todo.md#beta-access-and-billing).

| Object | Sandbox id |
| --- | --- |
| Product | `thido_pro` |
| Price | `price_1U9AWIIAJg9i73B6WtwPczxq` |
| Price lookup_key | `thido_pro_month_eur` |
| Terms | €12.00 / month, EUR, no trial |

To reproduce or recreate (idempotent):
`node --env-file=.env scripts/stripe/create-pro-plan.mjs`.

## Product (fixed — no real decision)

| Field | Value |
| --- | --- |
| Product id | `thido_pro` |
| Name | **Thido Pro** |
| Description | A monthly subscription to Thido's document editor with 300 AI credits each month, for people who want to enhance their writing with AI. |
| Tax code | `txcd_10000000` — General · Electronically Supplied Services (the preset the Dashboard shows for this product) |
| Marketing features (shown on Checkout, optional) | "10× the monthly AI allowance of the free plan" · "Unlimited documents" · "Word & PDF export" · "Priority AI queue" |

Statement descriptor (`THIDO.AI`, shortened `THIDO`) is an **account-level**
setting, not part of the product — configure it separately during activation
per [the descriptor note](./stripe-statement-descriptor.md).

The marketing feature list above is aspirational — only include the ones that
are actually enforced/differentiated by plan at launch. Today only the AI
allowance differs (30 vs 300 credits/month).

## Price — the decisions

### 1. Positioning / amount

| Option | Monthly | Annual (if added) | Notes |
| --- | --- | --- | --- |
| Founding-user | €8 | €80 | Temporary offer only; must be described as time-limited and grandfathered ~12 months. Thin margin. |
| **Balanced (recommended)** | **€12** | **€120** | The documented recommendation. €120/yr ≈ €10/mo, two months free. Leaves room for AI cost + Stripe fees. |
| Professional | €18 | €180 | Harder to justify while Thido is in beta. |

**Recommendation: €12/month.**

### 2. Currency

- **EUR** if Thido's legal entity, bank account, and early customers are in the
  euro area.
- **USD** if the first target market is primarily the US / a global USD-buying
  audience.

**Recommendation: EUR** unless you already know the entity/market is US-first.
`unit_amount` is `1200` (minor units).

### 3. Billing interval

The app currently supports only **one** `STRIPE_PRO_PRICE_ID`, so it can offer
exactly one interval until a monthly/annual selector is built.

- **Monthly only now (recommended).** The pricing doc says offer monthly first
  during the beta.
- Optionally also create the €120/year Price now so it exists for later — it
  just won't be shown until the app supports choosing.

**Recommendation: create the monthly Price only.**

### 4. Free trial

**Recommendation: none.** The free beta already lets people try Thido without a
card; a Checkout trial on top of that adds dunning complexity for no gain.

### 5. lookup_key

`thido_pro_month_eur` (pattern: `thido_pro_<interval>_<currency>`), so code and
scripts can fetch the Price without hard-coding its generated id.

## What runs after approval

```
# monthly, EUR 12.00 (the recommended default — no extra env needed)
node --env-file=.env scripts/stripe/create-pro-plan.mjs

# example override: USD 12.00
THIDO_PRICE_CURRENCY=usd node --env-file=.env scripts/stripe/create-pro-plan.mjs
```

It prints `STRIPE_PRO_PRICE_ID=price_…`. This goes into local `.env` and the
Vercel Preview, Development, **and Production** environments — the founder chose
to show the test-mode checkout in Production on the sandbox key
([decision record](./stripe-production-checkout-decision.md)). The id must be
swapped for a live Price at activation.

## Decisions made (2026-08-27, "go with recommendations")

1. Amount: **€12/month**
2. Currency: **EUR** (`unit_amount` 1200)
3. Interval: **monthly only** (annual deferred until the app has a selector)
4. Trial: **none**
5. Marketing features: **trimmed to the one enforced difference** — "10x the
   monthly AI allowance of the free plan"

## Next steps (sandbox testing)

- Set `STRIPE_PRO_PRICE_ID=price_1U9AWIIAJg9i73B6WtwPczxq` in local `.env` (done)
  and in the Vercel Preview, Development, and Production environments, then
  redeploy, to make Checkout render.
- Deploy `/api/webhooks/stripe`, add a sandbox webhook destination for it,
  subscribe the four subscription lifecycle events, and set
  `STRIPE_WEBHOOK_SECRET`.
- Configure the sandbox Customer Portal.
- Run the sandbox test matrix in [billing.md](./billing.md).
