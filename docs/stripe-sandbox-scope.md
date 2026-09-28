# What a Stripe sandbox lets you do, and when you need a company

Short answer to the two questions:

- **You can build and test the entire Thido billing flow in the Stripe sandbox
  now** — products, prices, Checkout, webhooks, the Customer Portal, renewals,
  failed payments, refunds, disputes — with fake money and test cards.
- **You do not need a registered company (or any legal entity, bank account, or
  tax registration) to use the sandbox.** You need those only to *activate* the
  account for live payments.

## What the sandbox is

A Stripe sandbox is an isolated test environment with its own API keys
(`sk_test_…` scoped to that sandbox), its own Dashboard data, its own webhook
endpoints, and its own configuration. Nothing in it moves real money. Thido's
sandbox is the `stripe-cobalt-harbor` resource that the Vercel Marketplace
integration provisioned; it is currently unclaimed (see
[the Vercel/Stripe email note](./vercel-stripe-different-email.md)).

Creating or claiming a sandbox requires only a Stripe login (email + password).
No business name, address, tax ID, ID document, or bank account is requested.

## What you can do in the sandbox (no company needed)

Everything Thido's billing code touches:

| Capability | Use for Thido |
| --- | --- |
| Create **Products** and recurring **Prices** | The "Thido Pro" product and its €12/month Price. The `price_…` id goes in `STRIPE_PRO_PRICE_ID`; the founder chose to set it in Production too, as a test-mode preview ([decision](./stripe-production-checkout-decision.md)). |
| Hosted **Checkout** sessions | `startSubscriptionCheckout` in `src/app/billing-actions.ts`. Pay with test cards (`4242 4242 4242 4242`, decline cards, 3-D Secure / SCA test cards). |
| **Webhooks** | Point a sandbox webhook destination at the deployed `/api/webhooks/stripe`, subscribe `checkout.session.completed` and `customer.subscription.created/updated/deleted`, put the `whsec_…` in the matching non-production env. Verify signature checking and `StripeWebhookEvent` idempotency. |
| **Customer Portal** | `openBillingPortal`. Configure cancellation and payment-method controls, then test them. |
| **Test clocks** | Fast-forward time to observe renewal, dunning, and `past_due` → `canceled` transitions without waiting a month. |
| **Stripe CLI** (`stripe listen`, `stripe trigger`) | Replay events locally, simulate duplicate delivery, failed payments, disputes, refunds. |
| **Statement descriptor**, branding, business info | Draft and validate the `THIDO.AI` descriptor format (see [the descriptor note](./stripe-statement-descriptor.md)). |
| **Stripe Tax** (test) | Preview VAT calculation behaviour before committing to it. |
| **Team members** | Invite a second login with a role instead of sharing a password. |

This covers the full sandbox test matrix already listed in
[`billing.md`](./billing.md) and `docs/production-todo.md` (checkout success and
decline, duplicate webhooks, renewal, failed payment, portal cancellation, and
confirming free beta never asks for a card).

## What the sandbox cannot do

- Move real money, or pay out to a bank account.
- Issue live API keys (`sk_live_…`) or process a real customer's card.
- Confirm real-world specifics that only exist in live mode: actual payout
  timing, how the descriptor renders on a real bank statement, live tax
  remittance.
- Carry its data to live mode. Products, Prices, webhook endpoints, and Portal
  settings created in the sandbox **must be recreated in live mode** (through
  the Dashboard or the API with a live key). The sandbox `price_…` id will not
  work with live keys, so `STRIPE_PRO_PRICE_ID` has to be swapped for a live
  Price id at activation — even though it is set in Production now.

## When you need a company (and what "activation" requires)

Going live means **activating** the Stripe account. Stripe then asks for, and
verifies:

- business type and legal name;
- business/residential address and country;
- a tax identification number — a company number for an entity, or a personal
  tax ID if you register as an individual;
- an identity document for the account representative;
- a **bank account** for payouts;
- website, product description, and a customer support contact (Thido's are
  drafted in [the business description](./stripe-business-description.md)).

You do **not** strictly need an incorporated company: Stripe supports
activating as an **individual / sole trader** in Ireland, the UK, the US, and
most of the EU. You could take live payments under a personal name with a
personal bank account.

A registered company is worth having before a real launch because:

- **Merchant of record & liability.** Charges, refunds, and chargebacks sit
  with whoever owns the account. An entity ring-fences that from you
  personally.
- **VAT / OSS.** Selling digital services to EU consumers creates a VAT
  obligation in the customer's country from the first sale (no small-seller
  threshold for cross-border B2C digital services). You register for VAT
  (typically via the One-Stop Shop), charge it, and remit it. Stripe Tax can
  calculate it, but registration and filing are yours, and that normally means
  an entity plus an accountant.
- **Billing legal name and bank account** that read as "Thido", not your
  personal name, on invoices and statements.
- **Contracts and terms** (the Terms of Service, DPA, subprocessor list) are
  cleaner when a company is the counterparty.

## Doing catalogue setup programmatically

The "Add a product" dialog is just a wrapper over the Stripe API, so none of it
has to be done by hand.

- **Repo script:** `node --env-file=.env scripts/stripe/create-pro-plan.mjs`
  creates (or reuses) a `thido_pro` product and a recurring Price, and prints
  the `price_…` id. It refuses a live key unless `THIDO_ALLOW_LIVE=1`. Set
  `STRIPE_SECRET_KEY` to the sandbox key first (Stripe Dashboard → Developers →
  API keys, or `vercel env pull`). Amount, currency, and interval are env vars.
- **Stripe CLI:**
  ```
  stripe products create --name "Thido Pro"
  stripe prices create --product prod_xxx \
    --unit-amount 1200 --currency eur \
    -d "recurring[interval]"=month --lookup-key thido_pro_month_eur
  ```
- **REST API:** `POST https://api.stripe.com/v1/products` then
  `POST /v1/prices` with the sandbox secret key as the bearer token.

Give the Price a `lookup_key` so later code or scripts can fetch it without
hard-coding the generated id. The id goes in `STRIPE_PRO_PRICE_ID` in every
environment ([Production included, by decision](./stripe-production-checkout-decision.md)).

## Suggested sequence

1. **Now — no entity required.** Claim the sandbox to the Stripe login that
   should own Thido's payments, then in the sandbox: create the Thido Pro
   product and Price, deploy and wire the webhook, configure the Portal, and
   run the full test matrix. `STRIPE_PRO_PRICE_ID` is set in all environments,
   Production included, as a test-mode preview.
2. **Before launch — entity work.** Decide sole trader vs. company, open the
   bank account, sort VAT/OSS registration for your target markets, and get the
   customer-facing pricing, currency, interval, and entitlements approved.
3. **Activate** the Stripe account (identity + business verification), set the
   statement descriptor, then **recreate** the product and Price in live mode.
4. Swap `STRIPE_PRO_PRICE_ID` to the live Price id and set the live
   `STRIPE_WEBHOOK_SECRET` in Production. Checkout stops being test-only.

Related: [`billing.md`](./billing.md),
[billing launch checklist](./production-todo.md#beta-access-and-billing),
[approved pricing and launch requirements](./production-todo.md#beta-access-and-billing).
