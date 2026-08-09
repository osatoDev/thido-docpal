# Landing-page load speed

Measured 9 August 2026 against the public production site from Europe/Berlin.

## Short answer

The landing page is fast when opened directly, but entering through
`https://thido.ai` is inconsistent because the root route performs a dynamic
redirect to `/documents/new`.

- A throttled mobile Lighthouse run scored **96/100**, with **0.93 s FCP**,
  **2.73 s LCP**, **1.76 s Speed Index**, **0 ms Total Blocking Time**, and
  **0.048 CLS**.
- Three clean-browser visits through `thido.ai` had a median **2.50 s FCP**
  and **2.51 s load event**. Individual FCP results ranged from **0.90 s to
  3.53 s**, showing meaningful cold/warm variability.
- Three clean-browser visits directly to `/documents/new` had a median
  **1.00 s FCP** and **0.39 s load event**.
- Lighthouse attributed **783 ms** to the root redirect. In the three-browser
  comparison, bypassing that redirect improved median FCP by about **1.50 s**.

The current experience is therefore not uniformly slow: the warm, direct page
is good, but the default `thido.ai` entry path is slower and less predictable
than it needs to be. Mobile LCP also sits just above the generally accepted
2.5-second “good” threshold.

## Implementation status

The highest-value repository changes were implemented and verified against an
optimized local production build on 9 August 2026:

- `/` now returns the anonymous landing experience with `200 OK` in the first
  response instead of redirecting to `/documents/new`; signed-in users open
  their reusable blank Thido document by default and may opt into reopening
  their most recently used document.
- Page and layout session reads share a React-cached lookup, while the auth
  proxy now runs only for private page routes. Public pages, assets, and API
  handlers with their own authorization no longer cross that proxy boundary.
- The empty guided form is present in the server HTML. Saved session drafts
  restore after hydration without showing a spinner or being overwritten.
- Rollbar's browser bundle is loaded by the error boundaries only when an
  error is actually reported, rather than entering the anonymous initial
  script requests.

In a clean local browser session, the optimized production build stayed on
`/`, rendered five prompt textareas, transferred about **230 KB of scripts**,
and recorded a warm **35 ms response start**, **106 ms DOM content loaded**,
and **120 ms load event**, with no console, framework-overlay, or server errors.
These local timings verify the implementation but do not replace the production
and geographically distributed follow-up measurements below.

The public response is still dynamic and private because the shared root
layout reads theme/application cookies and session state. A separate static
public layout, further prompt-bundle splitting, deployment, and production
measurement remain open work.

## Measurements

### Clean-browser production runs

Each run used a separate browser session with no prior Thido cache.

| Entry URL | Sample | TTFB | FCP | DOM content loaded | Load event |
| --- | ---: | ---: | ---: | ---: | ---: |
| `thido.ai` → `/documents/new` | 1 | 2.78 s | 3.53 s | 3.49 s | 3.63 s |
| `thido.ai` → `/documents/new` | 2 | 1.34 s | 2.50 s | 2.47 s | 2.51 s |
| `thido.ai` → `/documents/new` | 3 | 0.38 s | 0.90 s | 0.61 s | 0.65 s |
| Direct `/documents/new` | 1 | 0.11 s | 1.03 s | 0.35 s | 0.40 s |
| Direct `/documents/new` | 2 | 0.10 s | 1.00 s | 0.34 s | 0.39 s |
| Direct `/documents/new` | 3 | 0.10 s | 0.85 s | 0.31 s | 0.36 s |

For the root visits, the redirect completed at 2.75 s, 1.31 s, and 0.36 s.
Once the redirected request began, the final page started responding within
23–27 ms in all three runs. That makes the dynamic root request—not the final
page response—the dominant source of variability.

The browser transferred about **351 KB over 23 requests**:

- approximately **266 KB of JavaScript** across 12 scripts;
- approximately **53 KB across two font files**;
- approximately **17 KB of CSS**;
- the remaining HTML, route data, analytics, and small requests.

The route is currently returned with `private, no-cache, no-store` and a Vercel
cache miss because the shared layout and page perform request-specific cookie
and authentication work.

### Throttled mobile Lighthouse

| Metric | Result | Assessment |
| --- | ---: | --- |
| Performance score | 96/100 | Strong lab score |
| First Contentful Paint | 0.93 s | Good |
| Largest Contentful Paint | 2.73 s | Slightly above the 2.5 s target |
| Speed Index | 1.76 s | Good |
| Total Blocking Time | 0 ms | Excellent |
| Cumulative Layout Shift | 0.048 | Good |
| Transfer size | 349 KB | Reasonable, with removable JavaScript |
| Unused JavaScript estimate | 80 KB | Clear reduction opportunity |
| Redirect savings estimate | 783 ms | Largest direct opportunity |

Lighthouse identified the `Start with what you know.` heading as the LCP
element. Of its 2.73-second LCP, about 0.63 s was TTFB and 2.10 s was render
delay. It found no long main-thread tasks and no render-blocking-resource
opportunity, so adding more client-side loading machinery would not help.

## Five ways to reduce initial load time

### 1. Serve the anonymous landing page directly at `/`

**Status: implemented in the repository; production deployment and
remeasurement remain.**

**Expected impact: highest; measured savings around 0.78 s in Lighthouse and
about 1.50 s at the median of the clean-browser comparison.**

The current [root page](../src/app/page.tsx) calls `auth()` and then redirects
anonymous users to `/documents/new`. That first dynamic request accounted for
nearly all of the slow-run variability.

Render the anonymous landing experience directly at `/`. Send signed-in users
to their reusable blank Thido document by default, retain an explicit Settings
preference for reopening the most recently used document, and expose blank
document, AI-assisted draft, and spreadsheet creation choices only from the
creation menu. This keeps default root opening predictable without charging
every new visitor for a personalized server redirect.

### 2. Give public pages a static, cacheable shell and perform authentication once

**Status: partially implemented. Session reads are deduplicated and the proxy
is scoped to private pages; the separate cacheable public layout remains.**

**Expected impact: high, especially for cold requests and visitors far from the
function region.**

The request currently crosses authentication boundaries in
[proxy.ts](../src/proxy.ts), [the root layout](../src/app/layout.tsx), and the
landing page itself. The layout also reads cookies, making the entire public
tree request-specific. Production consequently returns the landing page as
private and uncached.

Create a public route group/layout that does not call `auth()` or read account
settings. Keep authenticated application routes in their existing dynamic
layout. Where authentication is still needed, wrap the request lookup in a
shared cached function so the page and layout do not repeat it. A truly public
shell can be prerendered and served from the CDN instead of invoking the full
application path for every visitor.

### 3. Reduce the landing form's initial client bundle

**Status: not yet implemented beyond removing Rollbar from the initial request.**

**Expected impact: medium to high on mobile and slower devices.**

Lighthouse estimated approximately **80 KB of unused JavaScript**. The deployed
initial-prompt chunk transfers about **73 KB**, and Lighthouse considered about
**53 KB of that chunk unused during initial rendering**. The shared React/Next
runtime was the other major source of unused code.

Keep schema validation and large starter/helper data on the server where
possible. Split guided and freeform editors so only the selected mode loads,
and keep the first-render client island responsible only for field state and
session-storage synchronization. The objective is to ship the form behavior a
visitor can immediately use, not the full drafting workflow up front.

### 4. Keep Rollbar and authenticated global controls out of the anonymous critical path

**Status: partially implemented. Rollbar now loads on actual error reporting;
moving authenticated controls to a private layout remains.**

**Expected impact: medium; approximately 27 KB of deployed Rollbar-related
JavaScript plus less hydration work.**

The measured global layout wrapped every public page in a client Rollbar
provider and also included authenticated quick-action machinery. The deployed
Rollbar-related chunk transferred roughly **27 KB** before a visitor
interacted. Error boundaries now import Rollbar only when reporting an error.

Use the proposed public layout to omit authenticated controls entirely and
load browser error reporting after the first paint or during idle time. Server
error reporting can remain immediate. This retains observability while moving
non-visual client code out of the first-render path.

### 5. Server-render the usable empty form instead of a restoration spinner

**Status: implemented and browser-verified with an empty session and a saved
session draft.**

**Expected impact: medium for perceived readiness, LCP stability, and layout
stability.**

[InitialPromptForm](../src/components/wizard/InitialPromptForm.tsx) deliberately
returns a spinner for its server snapshot, then replaces it with the complete
form after hydration and a session-storage read. The landing page therefore
does not initially contain its primary usable interface, even when there is no
saved draft to restore.

Server-render the empty guided form as the stable default. After hydration,
merge a saved draft into those fields if one exists, without replacing the
whole subtree. This makes the primary action usable earlier and removes a
large hydration-time DOM swap. It is also the first place to investigate the
2.10-second LCP render-delay phase and the remaining 0.048 layout shift.

## Measurement gap and performance budget

These are synthetic lab results, not real-user percentiles. The project has
Vercel Web Analytics but does not currently include Vercel Speed Insights, so
there is no repository-backed p75 LCP, INP, CLS, FCP, or TTFB baseline by route.

Before and after implementing the changes:

1. add Speed Insights and collect at least one representative traffic window;
2. track `/` and `/documents/new` separately;
3. use a launch budget of p75 **TTFB under 0.8 s**, **FCP under 1.8 s**, **LCP
   under 2.5 s**, **INP under 200 ms**, and **CLS under 0.1**;
4. repeat the clean-browser and mobile Lighthouse tests from at least two
   geographic regions.

The first implementation should be the root-route change. It has the clearest
measured payoff and does not require reducing product functionality.
