# Can the current version of Thido support 100 users?

**Assessment date:** 3 August 2026  
**Scope:** Current repository and recorded production configuration

## Executive answer

Yes, the current version of Thido can reasonably support a controlled beta of
100 registered users when activity is spread throughout the day and only a
minority of users are active at once.

No, Thido has not yet demonstrated that it can safely support 100 users editing
or invoking AI at the same time. There is no representative load-test evidence,
and several production safeguards remain incomplete. The 100-account limit is
an enrollment control, not proof of concurrent capacity.

The practical recommendation is to admit users in monitored cohorts—25, then
50, then 100—while measuring database connections, request latency, errors, AI
latency and cost, and support demand. Do not market “100 simultaneous users”
until a representative load test passes.

## What “100 users” can mean

| Scenario | Current assessment | Reasoning |
| --- | --- | --- |
| 100 registered accounts | Supported by design | Thido has a transactionally enforced 100-seat beta gate. Account records themselves are a negligible workload. |
| 100 users active across a day | Reasonable for a controlled beta | Vercel handles stateless HTTP requests, Neon stores application data, document images use private Blob storage, and most actions are short request/response operations. This still needs production monitoring. |
| 10–25 users active at the same moment | Plausible but not measured | The architecture should accommodate a modest burst, but no repository evidence establishes latency or database headroom. |
| 100 users reading or editing different documents simultaneously | Unproven | It depends on the deployed Vercel and Neon limits, database connection behavior, document size, autosave frequency, and traffic mix. No load-test result confirms it. |
| 100 simultaneous AI generations or revisions | Not launch-ready | AI calls are expensive and slow relative to ordinary requests. Plan-based quotas, strict shared rate limits, spending alerts, and burst testing are incomplete. |
| 100 users editing the same document simultaneously | Not supported | Thido rejects stale whole-document saves to prevent silent overwrites, but live operation merging and shared cursors are deliberately deferred. |

## Why a 100-user beta is plausible

### The application tier can scale horizontally

Thido uses Next.js route handlers deployed on Vercel. The application does not
depend on one continuously running web server for ordinary document, account,
comment, export, and settings requests. Vercel can run additional function
instances when requests overlap.

### Durable data is kept outside function memory

PostgreSQL is the source of truth for users, documents, permissions, comments,
AI activity, billing state, and version history. Document images are stored in
private Vercel Blob storage. This avoids tying essential user data to an
individual function instance.

### Expensive and sensitive paths have an initial protection layer

Authentication, email, AI generation, comments, imports, and exports have
best-effort rate limits. AI usage and failures are recorded, and Rollbar plus
Vercel Web Analytics provide a starting point for operational visibility.

### The beta already has a hard enrollment ceiling

Seat allocation uses a PostgreSQL advisory lock inside a transaction, so
concurrent registrations cannot allocate more than the intended 100 beta
places. This protects the cohort size, although it does not limit how active
those users can be after registration.

## Why capacity is not yet proven

### There is no representative load test

Unit tests and browser smoke tests verify behavior, not throughput. The current
production checklist contains no completed test that simulates realistic
concurrent dashboard loads, autosaves, comments, exports, and AI requests.

### Rate limits are local to each function instance

The current limiter uses application memory. Each Vercel instance has a
different counter, and counters disappear when instances restart. It reduces
accidental bursts but is not a strict account-wide or deployment-wide quota.
A shared limiter or Vercel Firewall policy is needed before relying on it as a
cost or abuse boundary.

### Database headroom is unknown

The production checklist still calls for alerts covering connection exhaustion,
storage growth, and database errors. Backups or point-in-time recovery and a
tested restore procedure are also open. Without connection and query metrics,
there is no evidence-based concurrency limit.

### AI demand can dominate both latency and cost

One user can generate substantially more cost and function activity than many
users who only read or edit documents. Thido records AI usage, but per-plan
quotas, hard shared enforcement, spending alerts, and verified provider burst
behavior remain incomplete.

### Operational readiness is still incomplete

Alerts for elevated 5xx responses, timeouts, database failures, email failures,
and AI-provider failures remain open. Rollback and database restore procedures
also need verification. A system may technically serve requests while still
being unsafe to operate for real customers.

### The latest document-revision migration must be deployed

The repository contains the migration required by version history, stale-write
protection, and Word import, but the production checklist does not yet record it
as applied. The current code should not be deployed without its required schema.

## Recommended launch posture

### Safe claim now

“Thido is designed for a controlled beta of up to 100 registered users.”

### Claim to avoid

“Thido supports 100 concurrent users” or “100 people can edit together.” Neither
claim is supported by current test evidence or the current collaboration model.

### Cohort rollout

1. Admit up to 25 users and observe normal behavior for several days.
2. Review p95 request latency, 5xx errors, database connections, slow queries,
   AI failure rate, AI cost per active user, and support volume.
3. Increase to 50 only if the service remains stable and support is manageable.
4. Run the representative load test described below.
5. Increase to 100 after the test passes and production alerts, backups, and
   rollback ownership are verified.

## Minimum validation before opening all 100 seats

### Infrastructure and safety

- Apply the document-revision migration before deploying the related code.
- Create an isolated staging environment and database; never load-test the
  production database.
- Enable and verify database backups or point-in-time recovery.
- Add alerts for database connection exhaustion, query errors, Vercel 5xx
  responses, timeouts, and AI-provider failures.
- Verify application rollback and database restore procedures.

### Cost and abuse controls

- Define an AI allowance for beta users.
- Enforce AI quotas in a shared data store rather than per-instance memory.
- Configure warning and shutdown thresholds for daily and monthly AI spend.
- Add outer abuse protection with Vercel Firewall rules where appropriate.

### Representative load test

Run staged tests at 10, 25, 50, and 100 concurrent virtual users. Use a realistic
mixture rather than sending only lightweight page requests:

- 35% dashboard and document reads;
- 30% document autosaves across different documents;
- 10% comments and replies;
- 10% authentication and settings requests;
- 5% Word or PDF exports;
- 10% AI generation or revision requests, with a separate worst-case AI burst
  test constrained by the intended quota.

Include small, medium, and large documents and test both warm and cold periods.
Capture at least:

- p50, p95, and p99 latency by route;
- HTTP 4xx and 5xx rates;
- function duration and timeout rate;
- database connection count, query latency, and errors;
- AI provider latency, failures, tokens, and estimated cost;
- autosave conflicts and rejected stale writes;
- export duration and memory usage.

Set pass/fail thresholds before running the test. A reasonable initial target is
no data loss, no unexpected permission failures, less than 1% unexpected server
errors, no exhausted database connections, and stable p95 latency throughout a
30-minute sustained run. Route-specific latency targets should be based on the
first staging baseline rather than invented in advance.

## Final recommendation

Proceed with a controlled 100-account beta, but treat capacity as provisional.
The current architecture is credible for 100 registered users with modest,
staggered activity. It is not yet evidence-backed for 100 concurrent active
users, concurrent AI use, or same-document live collaboration.

The next decision should not be whether to redesign the application preemptively.
It should be whether the staged load test and production telemetry show a real
bottleneck. Improve the first measured constraint—database connections, AI
quotas, function duration, or another resource—before adding infrastructure
that the observed workload does not require.
