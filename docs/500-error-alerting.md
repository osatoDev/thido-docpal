# 500/error alerting: how it works and what's configured

Covers the "alerting on 5xx/errors" items in [production-todo.md](./production-todo.md#L369-L372).

## The errors were already reaching Rollbar

Thido's Rollbar setup ([src/lib/rollbar/](../src/lib/rollbar/)) was more complete than the original checklist wording suggested:

- **Thrown server errors are caught automatically.** Next.js's `onRequestError` instrumentation hook (`src/instrumentation.ts`) fires for any error that escapes a Server Action, Route Handler, or render, and reports it to Rollbar via `reportServerError` — no per-route code required.
- **Manually-handled failures are (almost all) reported explicitly.** Places that catch an error themselves and return a response — Stripe billing, auth email, account deletion, feedback, document images, etc. — call `reportServerError(error, { source, operation, ... })` in the catch block. I audited every `status: 500` response in `src`: 19 of the 20 already did this. The one gap, `src/app/api/documents/[id]/share/route.ts`, returned `500` without reporting when share-link creation silently failed to produce a token; I added the missing `reportServerError` call there.
- **Client-side crashes are caught too.** `src/lib/rollbar/client.ts` has `captureUncaught: true` and `captureUnhandledRejections: true`, plus explicit reporting from the React error boundaries (`src/app/error.tsx`, `src/app/global-error.tsx`).
- **Expected failures did not reach Rollbar at all, as of this audit.** Routine `404`/`401`/`409` responses (not found, unauthorized, lock conflicts) didn't call `reportServerError` — only genuinely unexpected failures did. This has since changed — see below.

## What was missing: a notification rule

Rollbar doesn't alert by default — it just stores occurrences until a **Notification Rule** tells it to email (or Slack/PagerDuty/webhook) someone. No rule existed.

## What's configured now

Created directly via Rollbar's Notifications API on 18 August 2026, using a project-scoped access token with `write` scope (Rollbar project → Settings → Access Tokens — distinct from the `post_server_item`/`post_client_item` tokens already used by the app to *send* occurrences in):

```
POST https://api.rollbar.com/api/1/notifications/email/rules
```

```json
[
  {
    "trigger": "occurrence",
    "status": "enabled",
    "filters": [
      { "type": "environment", "operation": "eq", "value": "production" }
    ],
    "config": { "users": ["osatog1@gmail.com"] }
  }
]
```

- **Trigger: `occurrence`** — fires on every single error occurrence, not just the first time a new error type is seen. This matches "alert on any error caused by the app, period," at the cost of not being digested/deduplicated — a recurring error will send one email per occurrence.
- **Scope: `production` only** — local/preview noise won't fire it.
- **Recipient:** `osatog1@gmail.com`. Note this had to be the actual Rollbar account login, not `osato@thido.ai` — the API rejected the `@thido.ai` address with `"The user osato@thido.ai cannot access the project thido-docpal"` because only `osatog1@gmail.com` (username `osatog1`) is a registered user on this Rollbar account (`GET /api/1/users` confirmed it's the only one). If you want alerts to also reach `osato@thido.ai`, that address needs to be invited as a Rollbar team member on this project first.
- Confirmed persisted: `GET /api/1/notifications/email/rules` returns the rule (id `8115270`, `status: enabled`).

## Update: 4xx responses now report too

Asked directly ("but i want to know of errors users experience that may be a bug"), then given the tradeoff explicitly (most 4xx are normal user behavior, not bugs — alerting on all of them risks flooding the inbox), the decision was: alert on every error, period, and narrow it down later once real volume is known.

Implemented on 18 August 2026: every routine `400`/`401`/`402`/`403`/`404`/`409`/`422`/`429` response across the API routes now also calls `reportServerError` (or goes through the shared `unauthorizedResponse`/`forbiddenResponse`/`aiAllowanceExceededResponse` helpers in `src/lib/apiResponses.ts`, which were made `async` and now report internally). Since the `occurrence` Rollbar rule above isn't filtered by level or status, this means the alert now fires on **all** of these too, not just genuine `500`s.

**Expect this to be noisy immediately.** `unauthorizedResponse()` alone fires on every signed-out or session-expired request to a protected API route — almost certainly the single largest source of volume, well before any real bug shows up. That's the accepted tradeoff for now.

## Still worth doing

- **Verify actual delivery** by deliberately triggering a production error and confirming the email arrives — the rule exists and is enabled, but an end-to-end send hasn't been observed yet.
- **Narrow the rule once volume is known** (give it a few days): likely candidates are switching from blanket `occurrence` to `new_item` + `reactivated_item` + an `occurrence_rate` spike threshold, or adding a level/status filter to exclude routine 4xx from the email while still keeping them visible in the Rollbar dashboard for pattern review.
- **Rotate the project access token** used to create this rule if you'd rather it not remain valid — it wasn't stored anywhere in the repo, only used for the API calls in this session.
