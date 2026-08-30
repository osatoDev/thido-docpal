# Beta access and Stripe billing

Thido reserves up to 100 account slots for the free beta. The database assigns
each new password or Google account a unique place from 1 through 100 inside a
PostgreSQL advisory-lock transaction, so concurrent registrations cannot exceed
the limit. Existing accounts receive the first places when migration
`20260731160000_add_beta_access_and_billing` is applied. A deleted account frees
its place for another registration.

Free beta users are not asked for payment details. Paid checkout is deliberately
hidden until a recurring Stripe Price is configured.

## Vercel and Stripe configuration

1. Install Stripe from the Vercel Marketplace and connect separate sandbox
   credentials to Production, Preview, and Development as appropriate.
2. In Stripe sandbox mode, create the product and recurring Price that Thido
   should offer. Copy its `price_...` identifier to `STRIPE_PRO_PRICE_ID`.
   This can be done by hand in the Dashboard, or programmatically with
   `node --env-file=.env scripts/stripe/create-pro-plan.mjs` (needs
   `STRIPE_SECRET_KEY` set to the sandbox key; safe to re-run — it reuses an
   existing product/Price by fixed id and `lookup_key`). The Stripe CLI
   (`stripe products create` / `stripe prices create`) and the REST API work
   too. Objects created in the sandbox do not exist in live mode and must be
   recreated there at launch.
3. Deploy the application, then add a Stripe webhook destination at
   `https://<production-domain>/api/webhooks/stripe`.
4. Subscribe the destination to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the destination signing secret (`whsec_...`) to
   `STRIPE_WEBHOOK_SECRET` in the matching Vercel environment and redeploy.
6. Configure the Stripe Customer Portal with the cancellation and payment-method
   controls Thido intends to support.

The integration-provisioned `STRIPE_SECRET_KEY` stays server-only. The browser
never receives it, accepts a Price ID, or handles card data; Checkout and the
Customer Portal are hosted by Stripe. Webhooks are verified against their raw
request body and signing secret before subscription data is written.

## Sandbox verification before enabling paid plans

Use a non-production account and Stripe test payment methods to verify:

- successful checkout returns to the Plan and billing page (`/billing`) and updates subscription status;
- duplicate webhook delivery is accepted without applying the event twice;
- renewal and failed-payment events update the stored status;
- cancelling through the portal records the end date and eventual deletion;
- a checkout cancellation leaves free beta access unchanged; and
- no card is requested during registration or ordinary beta use.

On 27 August 2026 the founder chose to set `STRIPE_PRO_PRICE_ID` in Production
to the sandbox Price, exposing a **test-mode** checkout as a preview — see
[the decision record](./stripe-production-checkout-decision.md). That does not
change what is required before accepting **real** payments: business approval of
pricing, currency, entitlements, taxes, refund handling, and support ownership,
plus claiming and activating the Stripe account and swapping in a live Price.
Real customer cards cannot complete checkout until then.
