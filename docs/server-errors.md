# Reading Thido server errors

## Local development

Read server errors in the terminal where `npm run dev` is running.

```bash
npm run dev
```

Requests handled by Server Components, Server Actions, Route Handlers, Auth.js,
Prisma, Resend, and Anthropic write their `console.error` output there.

The browser's developer console is different: it primarily shows errors from
client-side React code. If a request fails in the browser, use the browser's
**Network** panel to identify the failing URL, then read the corresponding
server error in the terminal.

## Finding the error behind “Thido could not finish responding”

The progress panel in the editor reports the safe user-facing outcome. It does
not show the raw server exception or provider response.

For the failure shown in the screenshot at approximately **22:32 on 30 July
2026**:

1. Open `/admin` in Thido.
2. Find **AI operations** → **Recent AI failures**.
3. Find the **Comment responses** failure closest to 22:32.
4. Note its error code and Anthropic request ID, when one is present.
5. Open the Thido project in Vercel.
6. Go to **Observability** → **Runtime Logs**.
7. Select the same environment as the failing page—normally **Production**.
8. Set the time range around 22:32 and search for one of:
   - `AI comment response failed`
   - `ai_generation.failed`
   - the provider request ID copied from `/admin`
9. Open the matching error entry to read its message and stack trace.

Berlin is on UTC+2 in July. If the log viewer is configured to show UTC,
22:32 Berlin corresponds to approximately **20:32 UTC**.

The browser's Network panel may show the comment request as successful with
HTTP `201`. That is expected: Thido saved the comment and returned before the
background AI operation failed. The failure therefore belongs in Runtime Logs,
not necessarily in the browser response.

If no matching entry appears, verify the selected Vercel environment and
deployment, widen the time range, then reproduce the comment failure while
Runtime Logs are open.

## Production on Vercel

1. Open the Thido project in the Vercel dashboard.
2. Open **Observability**, then **Runtime Logs**. Depending on the dashboard
   navigation version, this may appear simply as **Logs**.
3. Select the **Production** environment.
4. Filter the level to **Error** and narrow by the failing route when possible.
5. Reproduce the problem in another tab if it is not already represented in
   the selected time range.

Runtime Logs contain output from deployed server functions, including
`console.error` calls and structured AI lifecycle events.

From a terminal with Vercel CLI access, live logs can also be followed with:

```bash
vercel logs <deployment-url> --follow
```

Do not paste a Vercel token into chat, source code, or a committed environment
file.

## Build and deployment failures

Runtime Logs do not contain build failures. For those:

1. Open **Deployments** in the Vercel project.
2. Select the failed deployment.
3. Open its **Build Logs**.

TypeScript errors, missing build-time variables, Prisma generation failures,
and Next.js compilation failures appear there.

## AI errors

Thido provides two additional AI-specific views:

- `/admin` shows recent AI failures and seven-day success, latency, usage, and
  cost summaries.
- Vercel Runtime Logs can be searched for structured events such as
  `ai_generation.failed` and `ai_generation.telemetry_update_failed`.

The structured event includes the Thido generation ID and, when Anthropic
provides one, the provider request ID. It deliberately excludes prompts and
document content.

The `/admin` view is an operational summary; it does not replace Runtime Logs
for stack traces or non-AI server failures.

## Errors involving external services

- Database connection and Prisma errors appear in Vercel Runtime Logs. Neon
  also provides database-side logs and metrics.
- Email API failures appear in Vercel Runtime Logs; delivery and rejection
  details belong in the Resend dashboard.
- Anthropic request failures appear in Vercel Runtime Logs and the Thido admin
  AI section; provider-side usage can be reconciled in the Anthropic Console.

## Grouped errors in Rollbar

Thido is connected to Rollbar through the Vercel Marketplace. Rollbar groups
repeated browser and server exceptions into issues and attaches stack traces,
deployment information, and sanitised operational context.

Open the connected resource from Vercel:

1. Open the `thido-docpal` project in Vercel.
2. Open **Integrations** and select the connected Rollbar resource.
3. Use **Open in Rollbar** to enter the project through Vercel SSO.
4. Open **Items** in Rollbar and filter the environment to `production`.

Thido also reports handled AI and email failures because those errors would not
reach a framework error boundary. Document text, prompts, comments, form input,
email addresses, request bodies, and share-link tokens are excluded or
redacted. Session replay and automatic browser telemetry are disabled.

Production notification rules and a controlled end-to-end alert test remain
open in `docs/production-todo.md`.
