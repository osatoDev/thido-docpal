# Admin page usefulness recommendations

The current admin console already covers application totals, founder replies,
waitlist decisions, AI usage and failures, traffic, configuration readiness, and
recent documents. The next improvements should turn those separate panels into
an operational workspace rather than adding more passive totals.

## 1. Unified action queue

Put founder replies, waitlist decisions, failed AI jobs, abandoned processing
locks, and configuration failures into one deadline-ordered queue. Each row
should open the exact record and expose only the actions valid for that item.

## 2. User directory and account drill-down

The initial paginated directory now shows beta-seat status, sign-in methods,
email-verification state, subscription state, document count, and comment count
using privacy-conscious metadata. Add search, account-level navigation, last
activity, and recent failures next; keep document content hidden by default.

## 3. Audited support actions

Provide narrowly scoped actions such as resending verification email, revoking
sessions, retrying a failed notification, or correcting a waitlist decision.
Require confirmation, state the impact, and write every action to an immutable
admin audit log.

## 4. Admin audit log

Record who approved or rejected access, replied to users, retried operations,
changed account state, or used a support action. Support filtering by actor,
action, target, outcome, and date.

## 5. Activation and retention funnel

Show registration, verification, first document, first successful generation,
returning use, and conversion between those steps. Keep events content-free and
make date range and cohort definitions explicit.

## 6. AI budget and anomaly controls

Add daily and monthly spend against configurable budgets, cost by feature and
user, unusually expensive calls, provider/model mix, and alerts before limits
are reached. Link failures to their content-free request metadata.

## 7. Background-work health

Surface pending and processing AI jobs, their age, lock expiry, retry count, and
last error. Allow a safe retry or lock release only when the server can prove the
job is abandoned.

## 8. Deployment and migration readiness

Show the active deployment, commit, environment, database migration status,
last successful production smoke check, webhook readiness, and links to relevant
Rollbar or Vercel views. Do not treat the presence of an environment variable as
proof that an external integration works.

## 9. Document operations search

The document total now opens paginated metadata with owner, status, revision,
comment and collaborator counts, share state, update time, and last access. Add
search, age and size filters, and collaboration-mode detail next. Opening content
should remain a separate, explicit support action.

## 10. Time ranges, comparisons, and exports

Apply one date-range control across traffic, signups, active users, AI usage,
failures, and cost. Include previous-period comparison and CSV export for
reconciliation without turning the dashboard itself into a dense reporting
tool.

## Recommended order

Start with the unified action queue, user directory, and audit log. They reduce
daily operational risk. Add AI budgets and background-work health next. Funnel,
document search, deployment readiness, and reporting controls become more useful
once the underlying events and audit records are reliable.
