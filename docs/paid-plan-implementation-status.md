# Paid-plan implementation status

Status checked: 13 August 2026

## Verdict

The **Stripe billing foundation is implemented** and a **Free-versus-Pro AI usage entitlement is now enforced**, but the **paid pricing plan is still not launch-ready or active**.

In practical terms, Thido can create a hosted subscription Checkout session, receive signed Stripe subscription events, persist subscription state, show that state in Settings, and open the Stripe Customer Portal. Checkout remains deliberately hidden because no recurring Price is configured. As of 13 August 2026, a paid subscription does change the product experience in one respect: Free-beta and Pro accounts now get different monthly AI action allowances, enforced server-side before every AI call (document generation, follow-up questions, and comment AI responses) and shown as a usage meter in Settings. Other entitlements (document limits, model access) are still undifferentiated by plan.

## What is implemented

- Authenticated hosted Stripe subscription Checkout in `src/app/billing-actions.ts`.
- Idempotent Stripe customer creation for a Thido user.
- A signed raw-body webhook endpoint at `src/app/api/webhooks/stripe/route.ts`.
- Handling for Checkout completion and subscription create, update, and delete events.
- Idempotent webhook-event persistence through `StripeWebhookEvent`.
- Persisted Stripe customer, subscription, Price, status, renewal date, and cancellation state on the user record.
- A Settings billing panel that shows Free beta or Paid subscription status.
- Stripe Customer Portal session creation for subscribers.
- Graceful hiding of checkout when Stripe or `STRIPE_PRO_PRICE_ID` is unavailable.
- A recommended initial commercial direction of **Thido Pro at €12/month**, documented as a recommendation rather than an approved public price.
- A server-enforced monthly AI action allowance that differs by plan (`src/lib/entitlements.ts`): 30 actions/month on the Free beta plan, 300/month once `hasPaidSubscription` is true, with heavier weights for whole-document actions and the Opus model. All four AI call sites (document generation, follow-up questions, selection and whole-document comment responses) check and consume this allowance before calling Anthropic, degrade gracefully with a clear in-product message when exhausted, and reset at the start of each UTC month. A read-only usage meter is shown in the Settings billing panel. The specific limits and action weights are a functional default pending explicit business approval, not a published entitlement.

## What is not implemented or activated

- No approved production price, currency, billing interval, entitlement set, or launch date.
- No `STRIPE_PRO_PRICE_ID` in the local effective environment; the production checklist also records it as intentionally unset.
- No `STRIPE_WEBHOOK_SECRET` in the local effective environment; the production checklist records the production webhook destination and signing secret as unfinished.
- The Stripe account is still recorded as sandbox-only and not activated for live payments.
- No verified end-to-end sandbox run covering checkout, renewal, failed payment, cancellation, portal management, or duplicate webhook delivery.
- No automated billing test suite currently covers checkout gating, webhook verification, idempotency, or subscription-state transitions.
- Document limits and model access are not yet differentiated by plan; only the monthly AI action allowance is. Paid status now changes AI allowance in addition to the billing display and portal access.
- The AI credit consumption in `checkAndConsumeAiAllowance` is a best-effort read-then-write, matching the existing in-memory rate limiter's risk tolerance; it is not race-safe under true concurrent requests from the same user and has no distributed spending alert.
- Only one recurring Price ID is supported. Monthly and annual plan selection is not implemented.
- Tax/VAT handling, refunds, disputes, billing support ownership, and the final statement descriptor are not approved and verified.

## What a user sees today

When no valid billing offer is configured, Settings shows **Free beta** and the message that paid plans are being prepared. No checkout button is rendered. Existing beta access remains free and does not require a card.

If a valid recurring Price is configured, Settings can render a Checkout button using the Price's product name, amount, currency, and interval. That configuration alone should not be enabled in production until webhook processing, entitlements, customer-facing terms, and the sandbox test matrix are complete.

## Minimum path to launch

1. Approve the initial plan's price, currency, interval, included features, and AI allowance (the current 30/300 monthly action limits are a functional default, not an approved figure).
2. Extend Free-versus-Pro enforcement from AI actions to any other planned entitlement (document limits, model access), and add automated tests for the allowance gate.
3. Claim and activate the Stripe account, while completing business and statement-descriptor configuration.
4. Create the approved recurring Stripe Product and Price.
5. Configure the webhook destination, subscribed events, signing secret, and Customer Portal.
6. Add automated billing coverage and complete the full sandbox checkout and lifecycle test matrix.
7. Resolve tax/VAT, refund, dispute, and billing-support procedures.
8. Set `STRIPE_PRO_PRICE_ID` in Production only after the preceding checks pass.

The running launch checklist remains [the production checklist](./production-todo.md), and operational setup is described in [the Stripe billing guide](./billing.md).
