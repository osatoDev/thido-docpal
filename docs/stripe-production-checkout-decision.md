# Decision: show Stripe checkout in Production on the sandbox key

**Date:** 2026-08-27 · **Decided by:** founder (osato_dev) · **Reverses:** the
"keep `STRIPE_PRO_PRICE_ID` unset in Production until launch is approved"
guardrail previously recorded in the billing documentation. Current launch
requirements are in the [billing launch checklist](./production-todo.md#beta-access-and-billing).

## What was decided

Set `STRIPE_PRO_PRICE_ID` to the sandbox Price
(`price_1U9AWIIAJg9i73B6WtwPczxq`, Thido Pro, €12/month) in the Vercel
**Production** environment, making the "Choose Thido Pro" button visible to
every authenticated beta user on `thido.ai`.

## What this actually does

Production runs the **sandbox** `STRIPE_SECRET_KEY`, so:

- The checkout button opens a Stripe Checkout session in **test mode**.
- Only Stripe test cards (`4242 4242 4242 4242`, etc.) complete it. A real
  customer card is declined by Stripe.
- **No real money moves and no real subscription is possible.** `hasPaidSubscription`
  can flip to `true` for an account that completes a *test* checkout (once the
  webhook is wired), which would grant that account the Pro AI allowance (300
  vs 30 credits/month) without a real payment.

The founder accepts this: the flow is a functional preview, not live commerce,
until the Stripe account is activated.

## Accepted risks

- Beta users see a priced plan and a checkout page that cannot take their real
  card — a confusing dead end. No in-product "test mode" label or admin-only
  gate was added (declined).
- A curious user who pastes a known test card number would be granted Pro
  entitlements for free. Mitigation deferred.
- The `neondb` database is shared across local/preview/production, so test
  subscription state is written to the same rows real accounts use.

## Still required before accepting real payments

Unchanged by this decision — these gate *live* commerce, not the button:

1. Claim and activate the Stripe account (identity + business verification +
   payout bank account) to obtain a live key.
2. Decide the legal entity and VAT/OSS registration
   ([stripe-sandbox-scope.md](./stripe-sandbox-scope.md)).
3. Business approval of the price, currency, interval, and entitlements.
4. Recreate the Product and Price in **live** mode; swap `STRIPE_PRO_PRICE_ID`
   to the live Price id.
5. Live `STRIPE_WEBHOOK_SECRET` in Production.
6. Refund, dispute, tax, and billing-support procedures; Terms of Service that
   cover paid subscriptions.
7. Complete the sandbox test matrix in [`billing.md`](./billing.md) and add
   automated billing test coverage.

## Wiring for the preview flow to work end to end

- `STRIPE_PRO_PRICE_ID` in Vercel Production → redeploy. (Button appears.)
- Webhook endpoint + `STRIPE_WEBHOOK_SECRET` in Production
  (`scripts/stripe/create-webhook.mjs`) → otherwise a completed test checkout
  never updates `stripeSubscriptionStatus` and Settings stays on "Stripe is
  confirming your subscription."
- Configure the sandbox Customer Portal so "Manage billing" works.
