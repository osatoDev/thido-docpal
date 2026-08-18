# Is Thido ready for a Reddit post targeting 100 beta users?

Assessed 17 August 2026, updated 18 August 2026, against [docs/production-todo.md](./production-todo.md), the running source of truth for production readiness.

## Verdict: not yet — a handful of items would directly break or endanger the launch

The 100-account beta gate itself is built and was last verified live (93 of 100 places remaining after 7 seated accounts), so the core "let 100 people in" mechanism exists. But several unresolved items sit directly in the path of a stranger arriving from a Reddit link, and one is a cost-exposure risk once a post is public.

## Resolved since the initial assessment

- **Google OAuth publishing status and verification** ([production-todo.md:100-101](./production-todo.md)). Confirmed **Publishing status: In production**, **User type: External** (17 August 2026), and Google Auth Platform → Branding shows **"Your branding has been verified and is being shown to users"** (18 August 2026). Thido's Google sign-in only requests basic `openid`/`email`/`profile` scopes, so this is the relevant verification tier — the "Google hasn't verified this app" interstitial and the 100-user OAuth cap should no longer be practical concerns. A live sign-in in production was confirmed working on 18 August 2026 (denied-consent and same-email-collision behavior are still unverified, [production-todo.md:102](./production-todo.md)).
- **500/error alerting** ([production-todo.md:371](./production-todo.md)). A Rollbar email notification rule now fires on every error occurrence in production (not just new/reactivated ones), sent to the account's registered address. Errors were already reaching Rollbar via automatic instrumentation and explicit `reportServerError` calls (one uncovered gap in the share-link route was fixed); the missing piece was the notification rule itself, created via Rollbar's Notifications API. Details in [docs/500-error-alerting.md](./500-error-alerting.md). Still worth confirming an actual delivered email before the post.

## Must fix before posting

1. **Email deliverability is unverified** ([production-todo.md:36](./production-todo.md), [108-109](./production-todo.md)). SPF/DKIM aren't confirmed configured, there's no DMARC policy, and no one has sent and confirmed a real verification or password-reset email against production. If those land in spam or don't arrive, password-based signups silently stall at the verification step — exactly the flow most Reddit visitors without a Google account would use.

2. **No AI provider spend limits are configured** ([production-todo.md:299](./production-todo.md)). A Reddit post is an uncontrolled traffic event. Without provider-side usage/spending caps, an unexpected spike (or someone probing the AI endpoints) is a direct billing risk. The per-user monthly allowance exists in-app, but that doesn't protect against a runaway aggregate bill.

3. **The beta-cap/waitlist path hasn't been exercised end-to-end in production** ([production-todo.md:280](./production-todo.md), [442](./production-todo.md)). You're explicitly relying on the 100-account cap and waitlist to handle a Reddit-sized crowd. Neither "account 101 is correctly waitlisted" nor waitlist approval/rejection emails have been verified against production since the migration landed.

4. **Nine `npm audit` vulnerabilities (seven high, two critical) are unaudited** ([production-todo.md:381](./production-todo.md)). Worth a quick pass to confirm none are production-reachable before inviting public traffic.

## Safe to defer (but do soon after)

- Backups/point-in-time recovery and a tested restore procedure aren't confirmed ([production-todo.md:66-67](./production-todo.md), [373](./production-todo.md)) — low probability, high regret if a spike coincides with a data problem.
- No load test has been run at 100 concurrent users ([production-todo.md:317](./production-todo.md)) — the app will likely hold at beta scale, but this is unverified.
- The final launch verification checklist ([production-todo.md:432-447](./production-todo.md)) is almost entirely unchecked — fresh Google account sign-in, share-link revocation, full document lifecycle, admin authorization. Worth a fast manual pass, not a hard blocker.
- Support/legal contact addresses (`support@thido.ai`, etc.) aren't confirmed monitored ([production-todo.md:421-422](./production-todo.md)) — fine for a small beta if you're personally watching for issues, but decide who's on point before posting.
- No CI workflow ([production-todo.md:343](./production-todo.md)) — operational hygiene, not a launch blocker at this scale.

## Bottom line

Fix items 1-2 (email deliverability, AI spend caps) at minimum — those are the ones most likely to either silently turn away Reddit visitors or create an uncapped cost exposure. Items 3-4 are worth a quick check since they're fast to verify. Everything else in "safe to defer" is real technical debt but won't sink a 100-person beta.
