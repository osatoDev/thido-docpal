# Post-cancellation UX: what it should be, and what it is today

Short answer to "is it proper the way it is now": **partially.** The
pending-cancellation *numbers* (credits, dates) are now correct after this
session's fixes, but there is no moment anywhere in the product that
acknowledges a cancellation happened, and the eventual downgrade to Free is
silent. Details below.

## The five moments of a cancellation

A cancellation isn't one screen, it's a sequence. Each moment has a different
job:

1. **The act of canceling** — confirming the user's intent and capturing why.
2. **Returning to the app right after** — confirming it worked and setting
   correct expectations ("you're not charged again, you keep access until X").
3. **Every subsequent visit to Settings/Billing while still in the paid
   period** — the state should read as "winding down," not as an ordinary
   active subscription, and should make undoing it easy.
4. **The moment access actually ends** — the plan silently becomes Free
   underneath the user; something should mark that transition happened.
5. **Considering coming back** — cancellation is a natural place to make
   resubscribing frictionless, since the user is already primed to think
   about the plan.

## What exists today, moment by moment

### 1. The act of canceling — mostly Stripe's job, and that's fine

Cancellation happens entirely inside Stripe's hosted Customer Portal
(`openBillingPortal` in [billing-actions.ts:104-125](../src/app/billing-actions.ts#L104-L125)
just creates a portal session and redirects there). Stripe's own hosted flow
already asks for a cancellation reason (that's where
`cancellation_details.feedback` comes from) and shows its own confirmation
before returning the user to `return_url`. There's no reason to duplicate
that in-app, and no gap here.

### 2. Returning to the app right after — missing

`return_url` is a bare `${getAppUrl()}/billing`
([billing-actions.ts:110-113](../src/app/billing-actions.ts#L110-L113)) with
no notice parameter, unlike the Checkout flow which explicitly appends
`?billing=success` / `?billing=cancelled` to its `success_url`/`cancel_url`
([billing-actions.ts:86-87](../src/app/billing-actions.ts#L86-L87)) and gets
a matching banner from `BILLING_MESSAGES`
([BillingPanel.tsx:13-17](../src/components/settings/BillingPanel.tsx#L13-L17)).
A user who cancels lands back on `/billing` and sees... the same page,
now reading "Access ends {date}" if they look closely. Nothing says "this
worked" or "you won't be charged again."

**Gap.** This is the single biggest missing piece. The fix is small and
follows the exact pattern already in the file: the Customer Portal can be
configured with a portal-flow return that Stripe tags, but the simplest
reliable option here is to check `cancelAtPeriodEnd` server-side on the
`/billing` page load coming back from the portal and show a one-time
confirmation, or more simply, always render a small "You're set to cancel"
acknowledgment as part of the pending-cancellation state itself (see #3)
rather than trying to detect "just returned from canceling" specifically.

### 3. Ongoing pending-cancellation display — now correct, still a bit passive

What's there now, gated on `paid`:
- "Current plan: Paid subscription" with "Stripe status: active"
  ([BillingPanel.tsx:98-105](../src/components/settings/BillingPanel.tsx#L98-L105)).
- "Access ends {date}" instead of "Renews {date}"
  ([BillingPanel.tsx:106-110](../src/components/settings/BillingPanel.tsx#L106-L110)).
- The AI usage line: "{N} credits left · Pro access ends {date}, then drops
  to the Free plan's 30/month"
  ([BillingPanel.tsx:64-71](../src/components/settings/BillingPanel.tsx#L64-L71)).

Both of these were bugs earlier in this session (`cancelAtPeriodEnd` wasn't
even being set correctly, and separately the AI-usage line didn't account
for it once it was) and are now fixed and unit-tested. **What's correct now
is genuinely correct.**

What's still weak:
- **"Stripe status: active"** sitting directly above "Access ends {date}" is
  contradictory-looking to a non-technical reader: "active" reads as "still
  going," undercutting the cancellation message right below it. This is also
  the only place in the product that names the payment vendor to the end
  user ("Stripe status:") rather than just showing a plain status.
- **The "Manage billing" button gives no hint that undoing the cancellation
  is possible.** `paid` stays true through the whole pending-cancellation
  window, so the button always reads "Manage billing"
  ([BillingPanel.tsx:180-188](../src/components/settings/BillingPanel.tsx#L180-L188))
  whether the user has an ordinary active subscription or one that's about to
  lapse. A user who changes their mind has to know to click into the portal
  and find Stripe's own "renew" option; nothing here says that's possible.
- The whole section still visually presents as a normal "your plan" card —
  there's no visual treatment (a warning-colored border, an icon, anything)
  distinguishing "winding down" from "everything's fine," so a user
  skimming the page could miss it.

### 4. The moment access actually ends — silent

Once the subscription's `customer.subscription.deleted` webhook lands,
`stripeSubscriptionStatus` becomes `"canceled"`, `paid` becomes `false`, and
`BillingPanel` reverts to looking exactly like a user who never subscribed:
"Free beta," no period-end line (correctly suppressed now that it's gated on
`paid`), 30 credits. Nothing marks that a downgrade *just happened* — no "Your
Pro plan ended on {date}" line, no `notice` banner, no email. A user who
comes back next week to find their credit limit dropped from 300 to 30 has no
in-product explanation of why, only the Stripe billing-portal history (which
most people never open) to piece it together from.

There is also **no cancellation confirmation or "your plan has ended" email**
anywhere in [src/lib/email.ts](../src/lib/email.ts) — the existing email
functions cover waitlist, feedback, invitations, and account-security events,
nothing billing-lifecycle-related. Losing access to a paid feature with zero
email trail is a common source of "I didn't know I was downgraded" support
tickets and chargeback disputes.

### 5. Win-back / resubscribe — adequate

Once fully canceled, the same "Choose {offer.label}/{offer.interval}" button
used for a brand-new signup appears ([BillingPanel.tsx:189-197](../src/components/settings/BillingPanel.tsx#L189-L197)).
That's a reasonable, low-friction resubscribe path; there's no dedicated
win-back copy ("we'd love to have you back"), but that's a nice-to-have, not
a gap.

## Verdict

Not fully proper yet. The *numbers* are trustworthy now (this session fixed
two real bugs in them). What's missing is entirely about **acknowledgment**:
nothing in the product ever explicitly says "your cancellation went through"
or "your plan just ended" — the user is left to infer both from passive
state changes on a page they have to think to revisit.

## Recommended fixes, roughly in priority order

1. **Acknowledge the cancellation moment.** Add a `billing=cancel-scheduled`
   (naming avoids colliding with the existing Checkout-abandoned
   `cancelled` notice) query param path, or simpler: always show a small,
   distinctly-styled inline banner at the top of the billing card whenever
   `paid && cancelAtPeriodEnd`, e.g. "Your subscription is set to end on
   {date}. You won't be charged again." This covers both the
   just-returned-from-portal moment and every subsequent visit, without
   needing to detect "just now" specifically.
2. **Make "undo" discoverable.** When `cancelAtPeriodEnd` is true, change the
   button label (still pointing at the same portal) to something like
   "Manage billing · Resume subscription" or add a one-line hint above it
   ("Changed your mind? Resume anytime before {date}.").
3. **Mark the downgrade moment.** When a user who was recently Pro loads the
   billing page and finds themselves on Free, show a one-time notice ("Your
   Pro plan ended on {date}"). This needs a way to know "recently downgraded"
   versus "always been free" — e.g. a short-lived flag set by the
   `customer.subscription.deleted` webhook handler and cleared once shown, or
   simply comparing `stripeCurrentPeriodEnd` (kept from the last paid period)
   against `now` for a few days after the transition.
4. **Send a cancellation-confirmed email and a plan-ended email.** Same
   pattern as `sendPasswordChangedEmail`/`sendSignInMethodAddedEmail` in
   [email.ts](../src/lib/email.ts) — low effort, closes the "why did my
   allowance drop" support gap, and is the kind of thing users expect for
   anything touching money.
5. **Soften "Stripe status: active."** Either drop the vendor name ("Status:
   Active") or suppress this line entirely when `cancelAtPeriodEnd` is true
   and let "Access ends {date}" carry the message alone, so the two lines
   don't read as contradicting each other.

**Status: fixes 2, 3, and 4 are implemented** (in `BillingPanel.tsx`,
`src/lib/billing.ts`, `src/lib/email.ts`, and the Stripe webhook handler),
unit-tested, and not yet deployed or browser-checked; see the production
checklist entry for exact details. Fixes 1 and 5 remain unimplemented by
choice, not oversight. This document is otherwise left as the original
point-in-time assessment, not rewritten into a changelog.
