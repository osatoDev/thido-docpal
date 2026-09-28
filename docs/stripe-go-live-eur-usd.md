# Going live: Stripe sandbox → live, serving both EUR and USD

This bundles two separate changes you asked for together: (1) moving off the
Stripe sandbox onto real payments, and (2) offering the Thido Pro price in
both EUR and USD instead of just EUR. Part 2 needs a decision before Part 3,
so read that before running anything.

Related background already in this repo, referenced throughout:
[stripe-sandbox-scope.md](./stripe-sandbox-scope.md),
[stripe-pro-plan-draft.md](./stripe-pro-plan-draft.md),
[stripe-production-checkout-decision.md](./stripe-production-checkout-decision.md),
[vercel-stripe-different-email.md](./vercel-stripe-different-email.md),
[stripe-statement-descriptor.md](./stripe-statement-descriptor.md),
[us-market-focus-strategy.md](./us-market-focus-strategy.md).

## Part 1 — Claim/verify the account and activate it

1. **Confirm who owns the Stripe account.** The connected `stripe-cobalt-harbor`
   resource may still be an unclaimed sandbox. In Vercel, open that resource →
   **Claim sandbox** → sign in with (or create) the Stripe login that should
   legally own Thido's payments — it does not need to match the Vercel login
   email. See [vercel-stripe-different-email.md](./vercel-stripe-different-email.md)
   for the full claim sequence.
2. **Activate the account** (Stripe Dashboard → *Activate your account*).
   You'll need: business type and legal name, address, a tax ID (a personal
   tax ID is fine if activating as an individual/sole trader), an identity
   document, and a bank account for payouts. This step is what unlocks live
   API keys (`sk_live_...`) — nothing before it requires any of this.
3. **Set the statement descriptor** to `THIDO.AI` (shortened: `THIDO`), per
   [stripe-statement-descriptor.md](./stripe-statement-descriptor.md).
4. Decide the legal entity/VAT question if you haven't
   ([us-market-focus-strategy.md](./us-market-focus-strategy.md) has the
   EUR-vs-USD-market reasoning; this doesn't block activation itself, but
   affects what business details you register).

## Part 2 — EUR + USD: pick one of two mechanisms

The app currently reads a single `STRIPE_PRO_PRICE_ID` and passes it straight
into Checkout (`src/app/billing-actions.ts:63-80`). Neither option below
requires you to run two completely separate Stripe integrations, but they
trade off differently.

### Option A (recommended): one Price, two currencies via `currency_options`

Stripe Prices support a `currency_options` map: one Price object has a
default currency plus per-currency amounts, and Stripe Checkout automatically
presents the buyer's currency based on their location — **no app code
changes needed**, since `STRIPE_PRO_PRICE_ID` still points at exactly one
Price id.

```js
// One-off, via the Stripe CLI or Node — sets USD as an alternate currency
// on the existing EUR price. Requires Adaptive Pricing to be available/
// enabled for the account (check Dashboard → Settings → Checkout and
// Payment Links → Adaptive Pricing before relying on this — it's a
// Stripe-account-level feature, not something the SDK types alone confirm
// is turned on for you).
await stripe.prices.update("price_XXXXXXXX", {
  currency_options: {
    usd: { unit_amount: 1300 }, // pick the USD amount deliberately, see below
  },
});
```

Pros: zero app changes, one Price id everywhere (env var, Checkout, webhooks,
`getBillingOffer()`'s display label all keep working unmodified). Cons:
depends on Adaptive Pricing being available for your account/region, and you
get less explicit control over exactly which buyers see which currency
(Stripe's own geolocation decides).

**Before relying on this**: confirm in the Stripe Dashboard that Adaptive
Pricing is actually enabled for your account. If it's not available, use
Option B instead.

### Option B: two separate Prices, the app picks one

Create two Price objects on the same Product (one EUR, one USD, both with
`lookup_key`s), and add a small amount of code to choose between them. This
gives explicit control (e.g. showing USD to `.com`/US-detected traffic and
EUR otherwise) at the cost of real changes:

- **Config**: two env vars instead of one —
  `STRIPE_PRO_PRICE_ID_EUR` / `STRIPE_PRO_PRICE_ID_USD` (or keep
  `STRIPE_PRO_PRICE_ID` as the EUR default and add one more var for USD, to
  avoid a bigger rename).
- **`src/lib/billing.ts`**: `getBillingOffer()` currently retrieves and
  returns exactly one price; it would need to accept a currency parameter (or
  return both offers) and be called with a currency resolved from the
  request (`Accept-Language`, a `?currency=` query param, or a stored user
  preference — there's no existing geolocation/locale-detection utility in
  this codebase to reuse, so that part would be new).
- **`src/app/billing-actions.ts`**: `startSubscriptionCheckout()` would take
  which Price id to use as a parameter instead of reading one fixed env var.
- **`BillingPanel.tsx`**: the "Choose {offer.label}/{offer.interval}" button
  already renders whatever `getBillingOffer()` returns, so once that returns
  the right offer for the visitor, the button itself needs no further change.

This is a real (if small) feature, not a config flip — budget actual
engineering time for it, and decide the USD amount and the currency-selection
signal (geolocation vs. explicit user choice) before starting.

### Either way: decide the USD amount deliberately

€12/month is roughly $13 at typical FX rates, but SaaS pricing in the US
market conventionally rounds to a clean number rather than mirroring the FX
rate exactly (e.g. $12 flat, or $15 to price above the EUR equivalent and
absorb Stripe's cross-border/FX handling costs). This is a pricing decision,
not a technical one. [Paid-plan pricing](./paid-plan-pricing.md) records the
rationale for €12; the approved €12 EUR / $12 USD amounts are recorded in the
[production checklist](./production-todo.md#beta-access-and-billing).

## Part 3 — Recreate the product/Price in live mode

Nothing carries over from sandbox to live automatically — Products, Prices,
webhook endpoints, and Customer Portal settings all need to be recreated
against the live key.

```bash
# Recreate the product + EUR price live. THIDO_ALLOW_LIVE=1 is a deliberate
# safety gate in this script (it refuses a live key otherwise).
THIDO_ALLOW_LIVE=1 STRIPE_SECRET_KEY=sk_live_... \
  node --env-file=.env scripts/stripe/create-pro-plan.mjs

# If you're on Option A, add the USD currency_options as shown in Part 2 to
# the *same* live Price id this script just printed.
#
# If you're on Option B, run the script again with different currency env
# vars for a second, USD-denominated Price (the script's options are
# THIDO_PRICE_AMOUNT / THIDO_PRICE_CURRENCY / THIDO_PRICE_INTERVAL — check
# scripts/stripe/create-pro-plan.mjs's header comment for the exact list
# before running, since this doc doesn't duplicate every flag it supports).
```

Give whichever Price(s) you create a `lookup_key` (e.g. `thido_pro_month_eur`
/ `thido_pro_month_usd`) so they can be found later without hardcoding the
generated id — the sandbox Price already follows this convention.

## Part 4 — Recreate the webhook and Customer Portal in live mode

```bash
THIDO_ALLOW_LIVE=1 STRIPE_SECRET_KEY=sk_live_... \
  THIDO_WEBHOOK_URL=https://thido.ai/api/webhooks/stripe \
  node --env-file=.env scripts/stripe/create-webhook.mjs
```

This prints a fresh `whsec_...` — copy it now, Stripe only shows it once.

Then in the Stripe Dashboard (live mode), configure the Customer Portal:
cancellation behavior, payment-method update controls, and anything else
Thido intends to support — Portal configuration is also per-mode and does
not carry over from the sandbox.

## Part 5 — Swap environment variables in Vercel Production and redeploy

- `STRIPE_SECRET_KEY` → the live secret key.
- `STRIPE_PRO_PRICE_ID` → the new live Price id (Option A: the one Price with
  both currencies; Option B: pick which one is the "default"/fallback if the
  currency-selection logic needs one, plus whatever second env var Option B
  introduced).
- `STRIPE_WEBHOOK_SECRET` → the new live webhook signing secret from Part 4.
- Redeploy (or let the next push trigger it).

## Part 6 — Verify with real flows before calling it launched

- A real checkout completes and `/billing` reflects it (this session's
  `stripeCancelAtPeriodEnd`/webhook fixes make this path meaningfully more
  reliable than it was before, but it's still worth confirming end to end).
- A real cancellation (both "cancel at period end" and immediate) updates
  correctly and the new cancellation-lifecycle emails send
  (`sendSubscriptionCancelScheduledEmail` / `sendSubscriptionEndedEmail` in
  `src/lib/email.ts`).
- If Option A: open Checkout from a US-presenting context (a VPN or a
  Stripe-provided test tool for simulating locale) and confirm USD actually
  shows. If Option B: confirm both explicit paths render the right offer.
- Refund, dispute, and billing-support procedures exist somewhere reachable,
  since real chargebacks are now possible — this was previously deferred as
  a sandbox-only build phase; it isn't anymore once live keys are in.

## What NOT to do

Don't set `STRIPE_PRO_PRICE_ID` to a live Price id while `STRIPE_SECRET_KEY`
is still the sandbox key (or vice versa) — Stripe Price ids are scoped to the
mode (test/live) they were created in, and mismatching them makes Checkout
fail outright rather than degrade gracefully. Swap both together.
