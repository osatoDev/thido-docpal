# Paid-plan pricing suggestions for Thido

_Prepared 31 July 2026. Prices and competitor offers change; verify them before
making a public pricing claim._

## Recommended launch price

### Thido Pro

- **€12 per month**, cancel any time
- **€120 per year**, paid upfront
- The annual option is equivalent to €10 per month and gives the customer two
  months free, a 16.7% discount.

Use EUR if Thido's legal entity, bank account, and initial customer base are in
the euro area. If the first target market is primarily the United States or a
global USD-buying audience, use **$12 monthly / $120 annually** instead. Avoid
maintaining arbitrary one-for-one EUR and USD prices indefinitely; introduce
intentional regional pricing after there is enough conversion data.

This price is the best starting balance for an early product. It is low enough
to invite upgrades from free beta users, but high enough to leave some room for
AI inference, Stripe fees, support, and failed-payment costs. It also avoids
trying to match the price of much broader and more mature suites.

## Three reasonable options

| Positioning | Monthly | Annual | Best use | Main risk |
|---|---:|---:|---|---|
| Founding-user price | €8 | €80 | Validating willingness to pay with the first beta users | Thin margin and a low long-term value anchor |
| **Balanced launch (recommended)** | **€12** | **€120** | A credible individual Pro plan with controlled AI usage | Requires usage limits before activation |
| Professional | €18 | €180 | Higher AI allowances, premium models, and priority support | Harder to justify while Thido is still in beta |

If a founding-user offer is used, describe it as temporary and grandfather it
for a defined period such as 12 months. Do not present €8 as the permanent list
price unless the observed AI cost and support burden support it.

## Market context

Current official pricing provides useful boundaries rather than a formula:

- Google Workspace Business Standard lists **$14 per user/month on an annual
  commitment** and includes Gemini in Docs and other Workspace apps. Its annual
  option advertises roughly a 16% saving.
  [Google Workspace pricing](https://workspace.google.com/pricing?hl=en)
- Grammarly Pro lists **$30 monthly** or **$144 annually** ($12/month effective)
  and includes a monthly AI-prompt allowance.
  [Grammarly Pro pricing](https://support.grammarly.com/hc/en-us/articles/115000090011-How-much-does-Grammarly-Pro-cost)
- Jasper Pro lists **$69 monthly** or **$59/month when billed yearly**, reflecting
  its more specialised professional marketing position.
  [Jasper pricing](https://www.jasper.ai/pricing)

Thido is narrower than Google Workspace and earlier than Grammarly or Jasper.
That supports launching near €12 rather than copying their higher monthly
prices.

## Cost and margin guardrails

Do not sell an unlimited AI plan yet. Thido currently lets users select models
with materially different costs, including Sonnet and Opus, and it has not yet
implemented per-plan quotas.

### Should the customer price be linked to tokens?

**Internally, yes. Customer-facing, no.**

Token cost should determine whether a plan is sustainable, but Thido should not
ask ordinary users to buy or count raw input and output tokens. Customers value
a completed draft, a useful comment response, or an accepted revision. They do
not know how many tokens a document action will consume, and the same visible
task can cost more when:

- the document or conversation is longer;
- a more expensive model such as Opus is selected;
- the model produces a longer answer;
- prompt caching does or does not apply; or
- a provider changes its tokenizer or prices.

Anthropic, for example, currently prices Sonnet and Opus input and output tokens
at different rates. It also notes that Sonnet 5's tokenizer can produce roughly
30% more tokens for equivalent text, even when a model's per-token price has not
changed. A customer should not receive a surprising bill because of an
implementation detail like that.
[Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing)

### Recommended hybrid model

Keep the **€12/month subscription** and include a clearly described monthly AI
allowance. Measure raw tokens and estimated cost behind the scenes.

A customer-facing allowance can use **AI credits or actions**, with weights that
roughly reflect cost:

- a short answer or selected-text revision: one standard action;
- initial document generation or a whole-document revision: several actions;
- an Opus request: more actions than the Sonnet equivalent.

Those weights should be calibrated from Thido's real telemetry before being
published. Internally, monitor estimated AI cost per user and per feature, and
alert when a user's monthly cost approaches the plan's intended cost budget.

When the allowance is exhausted, use a predictable choice such as waiting for
the next monthly reset, buying a clearly priced add-on, or moving to a higher
plan. Do not apply surprise token overage charges. Annual subscribers should
still receive monthly allowance resets so one unusually active month cannot
consume an entire year's budget.

Provider price changes should trigger an internal margin review, not an
automatic customer price change. Review pricing at a regular interval and give
customers clear notice before changing the subscription price or allowance.

Before enabling checkout:

1. Set a monthly AI allowance or internal spend ceiling for Free and Pro.
2. Reserve no more than roughly **25% of net subscription revenue** for ordinary
   AI usage at launch, then adjust from observed usage.
3. Keep Opus on a smaller allowance than Sonnet, or treat it as a premium action.
4. Alert before a user exceeds the intended monthly AI-cost budget.
5. Review cost per active user weekly during the beta.

For a €12 EEA card payment, Stripe's published German standard rate starts at
1.5% + €0.25, and Stripe Billing's pay-as-you-go fee is listed separately as a
percentage of billing volume. International cards, currency conversion, tax,
refunds, and disputes can cost more.
[Stripe Germany pricing](https://stripe.com/en-de/pricing)

VAT treatment also affects the amount Thido retains. Confirm whether displayed
consumer prices include VAT, where tax must be collected, and whether Stripe
Tax or another process will be used before publishing prices. This document is
commercial guidance, not tax or legal advice.

## Monthly versus annual rollout

Offer **monthly first** during the beta. It lowers the commitment for early
customers and gives Thido time to validate retention, support burden, and AI
cost. Add the €120 annual option after the monthly flow and cancellation path
have been tested end to end.

The current application accepts only one `STRIPE_PRO_PRICE_ID`, so it cannot yet
let a customer choose between monthly and annual prices. Supporting both needs:

- separate monthly and annual Stripe Price IDs;
- a trusted server-side mapping of plan choice to Price ID;
- a billing-cycle selector in Settings; and
- tests for checkout, upgrades, cancellation, and webhook state for both prices.

## Suggested decision

Start with **Thido Pro at €12/month**. Keep the 100-user beta free, allow any free
user to upgrade voluntarily, and introduce **€120/year** only after monthly
billing and real AI cost per paying user have been verified.
