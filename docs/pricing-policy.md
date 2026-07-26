# Thido pricing policy (proposal)

Status: **draft, not implemented.** No billing integration exists in the codebase today. This document proposes a pricing structure to guide that work; it is not a commitment or a published price list.

Last reviewed: 26 July 2026

## Why pricing is needed

Every document generation and AI-assisted comment revision calls a paid model provider (see `src/app/api/documents/[id]/generate/route.ts` and `src/lib/ai/`). Today there is no cap tied to a plan, only best-effort per-instance rate limiting (`docs/rate-limiting.md`). `docs/production-todo.md` already flags undefined AI quotas and spending alerts as an open blocker — pricing and quota design should be settled together, since the plan tiers are what quotas are keyed to.

## Guiding principles

1. **Free tier stays real but bounded.** The guest-first flow (`docs/guest-document-flow.md`) already proves value before requiring an account; a free authenticated tier should let a user complete at least one full document end-to-end so the product is trustworthy, not a bait-and-switch.
2. **Price around AI generation events, not seats, for individuals.** The dominant marginal cost is model calls (initial draft generation + comment-driven revisions), so the free/paid boundary should be denominated in generations and revisions, not storage or document count.
3. **Teams pay for collaboration, not just volume.** Shared documents, comment threads, and admin controls are differentiators once multiple people work on the same document — this is a natural seat-based upsell distinct from individual AI usage.
4. **No surprise charges.** Usage-based overage must be opt-in and visibly confirmed before it is incurred; default behavior on hitting a quota is graceful blocking, not silent billing.

## Proposed tiers

### Free

- 1 active document at a time; up to 3 total documents.
- 5 AI-assisted actions per month (initial generation + comment-driven revisions combined).
- Full editor, commenting, and manual editing with no AI cost are unlimited.
- No export beyond copy/paste.
- Community/email support only.

### Plus — individual, paid

- Unlimited documents.
- 100 AI-assisted actions per month included; clearly labeled usage meter in-app.
- Export to common formats (once export is built — currently undecided per `docs/production-todo.md`).
- Priority queuing on AI requests during shared rate-limit contention.
- Email support with target response time.

### Team — paid, per seat

- Everything in Plus, per seat.
- Shared documents and comment threads across seats.
- Pooled AI-action quota across the team (e.g., seats × 100) rather than siloed per-user quotas, so usage evens out across contributors.
- Admin console: seat management, usage-by-member visibility, shared billing.
- SSO/SAML: out of scope for v1, flagged as a later add-on.

### Overage (Plus and Team)

- Optional metered top-up priced per additional AI-assisted action, purchased in blocks (e.g., packs of 50) rather than uncapped per-call billing, so a runaway loop cannot produce an unbounded invoice.
- Hard ceiling per billing period even for metered accounts, configurable by the account owner; requests beyond the ceiling fail gracefully with a clear upgrade/top-up prompt, consistent with the existing "fail gracefully when AI generation is unavailable" behavior.

## What counts as an "AI-assisted action"

To keep billing legible, define it narrowly and document it in-product:

- Generating an initial draft from guided or freeform input: 1 action.
- An anchored comment triggering an AI-suggested revision: 1 action per accepted or requested suggestion.
- Regenerating follow-up questions: not counted (cheap, no document-altering output).

This definition should live next to the quota-enforcement code once built, so the billed unit and the enforced unit cannot drift apart.

## Open questions to resolve before implementation

- Billing provider: Stripe is the default assumption (subscriptions + metered usage records) but is not yet integrated anywhere in this repo — confirm before building.
- Annual vs. monthly billing and any discount.
- Whether unused monthly AI actions roll over or expire.
- Grandfathering behavior for any existing accounts created before pricing launches.
- Currency and regional pricing/tax handling (VAT/GST) — ties into the GDPR and legal-review items already open in `docs/production-todo.md`.
- How refunds and mid-cycle plan changes are handled (proration policy).

## Relationship to existing production-readiness work

This proposal does not implement:

- Stripe or any billing integration,
- per-plan quota enforcement (currently only best-effort, non-plan-aware rate limiting exists),
- the admin visibility needed to see usage-by-plan, or
- Terms of Service language reflecting paid plans (`src/app/terms/page.tsx` currently only states "unless a paid plan is clearly offered and accepted").

Once a pricing structure is approved, add corresponding checklist items to `docs/production-todo.md` under a new "Billing and pricing" section covering Stripe integration, plan-aware quota enforcement, invoicing, and Terms of Service updates.
