# “AI usage this month” unit

The meter is measured in **weighted AI action credits**. It is not a token
count, number of documents, number of comments, or currency amount.

The current weights in `src/lib/entitlements.ts` are:

| AI operation | Standard model | Premium Opus model |
| --- | ---: | ---: |
| Generate planning follow-up questions | 1 credit | 2 credits |
| Generate a document | 5 credits | 10 credits |
| Action a batch of document comments | 5 credits | 10 credits |

One batched comment revision has one fixed weight regardless of how many
comments are included in that batch. The premium model doubles the normal
weight.

The meter's `used / limit` values therefore mean **credits used / monthly
credit allowance**. The current functional defaults are 30 credits for Free
beta and 300 credits for Pro, resetting at the beginning of each UTC month.
Those allowance amounts are implementation defaults and have not yet been
approved as published plan entitlements.

The Settings interface displays this as, for example, **12 / 30 credits**
(`src/components/settings/BillingPanel.tsx`), followed by "18 credits left", a
per-action breakdown for the current month, and a link to the full usage
history at `/settings/usage`. The word "credits" is a hover/focus tooltip (CSS
`group-hover` / `group-focus-within`, no client JavaScript) that summarises the
weights: follow-ups 1, document generation or a comment batch 5, premium Opus
doubles each, monthly reset.

Every consumption writes an `AiCreditCharge` ledger row, and failed actions
refund the charge. For the balance display, the audit page, and the refund
policy, see [`ai-credit-balance-and-audit.md`](./ai-credit-balance-and-audit.md).
