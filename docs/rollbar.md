# Rollbar for Thido

Rollbar is an application error-tracking service. It collects errors from the browser and server, groups repeated failures into issues, attaches useful context such as the deployed version and stack trace, and alerts the team when something breaks.

For Thido, Rollbar would make failures such as “Thido could not finish responding” easier to investigate. Instead of searching through a long stream of logs, you could open a grouped issue and see how often it happened, which deployment introduced it, and the relevant stack trace.

Rollbar is available as a [native Vercel Marketplace integration](https://vercel.com/marketplace/rollbar/error-tracking). Vercel describes support for connecting projects, tracking deployments and revisions, and aligning environments and source maps so production stack traces are readable. The Marketplace plan currently starts at $0.

## Rollbar and Vercel logs serve different purposes

Rollbar should complement Vercel Runtime Logs rather than replace them.

| Tool | Best used for |
| --- | --- |
| Vercel Runtime Logs | The chronological output from a particular request or function invocation, including the surrounding server logs |
| Rollbar | Grouped application errors, stack traces, affected releases, recurrence, ownership, and alerts |
| Thido AI observability | Model usage, latency, provider request IDs, estimated cost, and failure rates by AI feature |

When a user reports a problem, Rollbar can identify the issue and stack trace. Vercel logs can then provide the detailed request-level context. Thido’s AI observability remains the source for model and cost information.

## What it could catch in Thido

With the Rollbar JavaScript and React packages installed, it can report:

- Unhandled browser errors and React rendering failures.
- Uncaught server and API-route exceptions.
- Errors deliberately reported from handled failure paths.
- The deployment and environment in which an error occurred.
- Whether an issue is new, recurring, or reactivated.

Rollbar calls each individual event an occurrence and groups related occurrences into an item. This grouping is the main advantage over reading raw logs because hundreds of copies of the same error become one actionable issue. See Rollbar’s [occurrence grouping documentation](https://docs.rollbar.com/docs/grouping-occurrences).

There is an important limitation: Thido catches some failures itself so it can save a friendly status for the user. Background AI failures, email failures, and other caught exceptions will not necessarily reach Rollbar automatically. Those code paths need an explicit Rollbar reporting call while preserving the existing user-facing behavior.

## What Rollbar does not replace

Rollbar is not, by itself:

- An uptime monitor that checks whether the site is reachable.
- A database health dashboard.
- An AI usage or cost tracker.
- A replacement for structured application logs.
- A guarantee that every caught error will be reported.

Those concerns need their own monitoring. Rollbar’s role is to make application failures visible, grouped, and actionable.

## Privacy considerations for Thido

Thido documents and comments may contain sensitive customer information, so the integration should start with conservative data collection.

The implementation should:

- Never send document text, comments, prompts, request bodies, email addresses, cookies, authorization headers, or access tokens.
- Enable `scrubTelemetryInputs` and configure additional scrub fields before enabling browser telemetry.
- Use an opaque internal user ID only when identifying affected users is necessary.
- Leave session replay disabled initially.
- Keep the server access token secret. Only the limited client token may be exposed through a `NEXT_PUBLIC_` environment variable.
- Review Rollbar as a subprocessor and update Thido’s privacy documentation before production use.

Rollbar notes that browser telemetry may capture input values unless input scrubbing is configured. Its [telemetry documentation](https://docs.rollbar.com/docs/rollbarjs-telemetry) explains the relevant controls.

## Recommended alerts

Start with a small set of production-only alerts:

1. Alert immediately when a new critical or error-level issue appears.
2. Alert when a resolved issue reappears.
3. Alert when the same issue occurs at least five times within ten minutes.
4. Treat authentication, document-save, database, and permission failures as high priority.
5. Use a threshold for background AI failures rather than alerting on every occurrence, because Thido already records each failed AI operation.

Email notifications are enough initially. Slack or an incident-management service can be added when there is a team rotation. Rollbar supports rule-based notifications, but its documentation cautions that notifying on every occurrence can create excessive noise. See [Rollbar notifications](https://docs.rollbar.com/docs/notifications).

## Cost and operational tradeoffs

As of July 30, 2026, Rollbar’s [published pricing](https://rollbar.com/pricing) includes a free tier with 5,000 error occurrences and 1,000 sessions. That is likely sufficient for an early beta, but a repeated frontend error can consume the allowance quickly.

Known, harmless errors should be ignored, and noisy issues should be rate-limited or sampled where appropriate. Usage and billing alerts should also be enabled before upgrading.

The main advantages are:

- Fast setup through Vercel.
- Grouped errors instead of an undifferentiated log stream.
- Alerts when failures begin or return.
- Deployment and source-map context for production errors.
- A clearer path from the user-visible failure to the responsible code.

The main costs are:

- Another third-party service handling diagnostic data.
- A separate dashboard and notification stream.
- Careful scrubbing and data-governance work.
- Usage limits and possible event noise.
- Explicit reporting code for errors the application catches.

## Why Rollbar was suggested

Rollbar was the first exact application-error-tracking product returned by the Vercel Marketplace’s observability discovery for this project, and its native integration fits the requested Vercel-centered setup. This does not mean it is universally better than alternatives such as Sentry; it is a pragmatic fit for the current requirement.

Rollbar is installed on the `thido-docpal` Vercel project using its free
5,000-occurrence plan. The Marketplace resource is connected to production,
preview, and development, and its generated client and server tokens are
available in those Vercel environments.

The application SDK includes:

1. A browser provider and Next.js route and global error boundaries.
2. Next.js server error reporting through the framework’s `onRequestError` hook.
3. Explicit reporting for handled AI and email failures.
4. Environment and deployment metadata.
5. Privacy-safe payload scrubbing, route-token redaction, disabled session
   replay, and disabled automatic browser telemetry.

A content-free development occurrence was accepted by Rollbar’s ingestion API
with HTTP 200 on 30 July 2026, verifying that the generated server token and
project connection work.

Production notification rules and a controlled deployed error test still need
to be completed in the Rollbar dashboard. Vercel requires an interactive,
authenticated browser session for that dashboard, so the CLI cannot configure
those rules on the user’s behalf.

Open the connected
[Rollbar Marketplace resource](https://vercel.com/d/dashboard/integrations/rollbar/icfg_OqpaFShO7MryDqTuagGqEqe2/resources/ir_mq1Oy45VtH8IQgfU),
choose **Open in Rollbar**, then open **Notifications**. Create production-only
rules for:

1. A new `error` or `critical` item.
2. A resolved item that reactivates.
3. At least five occurrences of one item within ten minutes.

Send the notifications to the operational email address initially. After the
next deployment, trigger one controlled browser error and one controlled server
error, confirm that their route and payload are redacted, and confirm that the
email notification arrives before considering alerts complete.

The result should be a direct operational trail from a message such as “Thido could not finish responding” to a searchable Rollbar issue without exposing the document that the user was editing.
