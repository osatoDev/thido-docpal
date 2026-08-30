# Actioning the Thido Pro Stripe description

## Current status

The change is already actioned in Thido's connected Stripe **sandbox**. It was
updated and read back from Stripe on 30 August 2026.

The `Thido Pro` product (`thido_pro`) now has this description:

> A monthly subscription to Thido's document editor with 300 AI credits each
> month, for people who want to enhance their writing with AI.

The existing price remains €12 per month. Changing the product description did
not create or alter a price.

## Verify it in the Stripe Dashboard

1. Open the Stripe Dashboard and select the `stripe-cobalt-harbor` sandbox.
2. Go to **More → Product catalog**.
3. Open **Thido Pro**. Its product id is `thido_pro`.
4. Check the **Description** field for the text above.
5. If you edit it manually, click **Save product**.

Stripe states that a product description is shown at Checkout, in the customer
portal, and in quotes. See [Stripe's product and price management
documentation](https://docs.stripe.com/products-prices/manage-prices?locale=en-GB).

## When Thido moves to live Stripe

The present product is sandbox-only, so this change does not yet exist in live
mode. After the Stripe account is claimed and activated:

1. Create or copy **Thido Pro** into live mode.
2. Use the same description shown above.
3. Create the live €12/month Price and replace the sandbox
   `STRIPE_PRO_PRICE_ID` with the live Price id.
4. Verify the description in a live-mode Checkout preview before accepting
   payments.

The repository's provisioning script also contains the approved description:
`scripts/stripe/create-pro-plan.mjs`. Rerunning it against the sandbox keeps the
Stripe product synchronized with that copy.
