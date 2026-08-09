# Thido versus Google Docs landing speed

Measured 9 August 2026 from Europe/Berlin with separate clean browser sessions.
This report extends [the Thido landing-page baseline](./landing-page-load-speed.md).

## Conclusion

Thido is substantially lighter than Google Docs, but its default root redirect
currently hides that advantage.

- Entering through `thido.ai`, Thido's median first contentful paint was
  **2.50 s**, compared with **1.09 s** for a public Google Docs document shell.
  Google painted useful UI about **1.41 s sooner**.
- Opening Thido directly at `/documents/new` produced a **1.00 s** median first
  contentful paint, about **0.09 s faster** than the Google Docs shell.
- Direct Thido completed its load event in **0.39 s**, versus **2.45 s** for the
  Google Docs shell, while transferring approximately **0.35 MB instead of
  9.69 MB**.

The practical answer is: **Google Docs currently wins the first visit through
Thido's public domain, but Thido's actual landing page is already slightly
faster to first paint and dramatically smaller once the root redirect is
bypassed.** Removing that redirect should make the default Thido entry match or
beat the measured Google Docs first-paint speed.

## Like-for-like clean-browser results

Three separate clean sessions were used for each target. Medians are shown.

| Target | TTFB | FCP | DOM content loaded | Load event | Transfer | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Thido via `thido.ai` redirect | 1.34 s | 2.50 s | 2.47 s | 2.51 s | 0.35 MB | 23 |
| Thido direct `/documents/new` | 0.10 s | 1.00 s | 0.34 s | 0.39 s | 0.35 MB | 23 |
| Public Google Docs document shell | 0.40 s | 1.09 s | 0.92 s | 2.45 s | 9.69 MB | 119 |
| Google Docs public product landing | 0.13 s | 1.11 s | 0.37 s | 0.86 s | 0.86 MB | 107 |

### What these numbers mean

Compared with the public Google Docs document shell, direct Thido had:

- about **8% faster first contentful paint**;
- about **3.8× faster TTFB**;
- about **6.2× faster completion of the load event**;
- about **27.6× less transferred data**;
- about **5.2× fewer requests**.

Compared with Google's marketing/product landing, direct Thido had:

- about **10% faster first contentful paint**;
- about **2.2× faster completion of the load event**;
- about **2.5× less transferred data**.

The `thido.ai` redirect reverses the first-paint result. Through the redirect,
Thido was approximately **2.3× slower to first content** than the public Google
Docs shell, despite transferring much less data.

## Individual browser samples

| Target | Sample | TTFB | FCP | Load event |
| --- | ---: | ---: | ---: | ---: |
| Thido via root | 1 | 2.78 s | 3.53 s | 3.63 s |
| Thido via root | 2 | 1.34 s | 2.50 s | 2.51 s |
| Thido via root | 3 | 0.38 s | 0.90 s | 0.65 s |
| Thido direct | 1 | 0.11 s | 1.03 s | 0.40 s |
| Thido direct | 2 | 0.10 s | 1.00 s | 0.39 s |
| Thido direct | 3 | 0.10 s | 0.85 s | 0.36 s |
| Google Docs public document | 1 | 0.40 s | 0.89 s | 2.32 s |
| Google Docs public document | 2 | 0.43 s | 1.17 s | 2.45 s |
| Google Docs public document | 3 | 0.33 s | 1.09 s | 2.77 s |
| Google product landing | 1 | 0.13 s | 1.12 s | 0.86 s |
| Google product landing | 2 | 0.13 s | 0.69 s | 0.74 s |
| Google product landing | 3 | 0.13 s | 1.11 s | 0.86 s |

Google's first paint was more consistent than Thido's root entry. Thido's
direct page was similarly consistent and carried much less post-paint work.

## Mobile Lighthouse context

The same throttled mobile Lighthouse configuration produced:

| Public landing page | Score | FCP | LCP | Speed Index | TBT | CLS | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Thido `thido.ai` | 96 | 0.93 s | 2.73 s | 1.76 s | 0 ms | 0.048 | 0.35 MB |
| Google Docs product landing | 47 | 6.91 s | 16.92 s | 7.60 s | 418 ms | 0 | 2.88 MB |

This mobile result favors Thido strongly, but it is not a direct editor-shell
comparison. Google's product page contains extensive imagery, marketing
sections, tag-manager scripts, 68 scripts, 24 fonts, and 152 total requests.
Its largest-contentful element was a hero image. Thido's page is intentionally
much simpler.

Lighthouse could not audit the full anonymous Google Docs editor shell on a
mobile user agent because Google redirected it to a simplified `mobilebasic`
document view. That result was excluded.

## What was compared—and what was not

The public Google Docs editor measurement used a publicly accessible
[sample document](https://docs.google.com/document/d/1MPm4fG_RVwwoc3sqQhC_NBjJ_T0eVVGqUBHyS0MSUVY/edit)
in the standard desktop Docs shell. The separate public-page comparison used
Google's [Docs product landing](https://workspace.google.com/products/docs/).
The editor-shell target includes the real
Google Docs menus, toolbar, outline, document canvas, sharing state, and
anonymous-presence UI. The document itself was not used to judge product
quality; it was only a stable way to load the application shell without using
private credentials.

An authenticated blank Google Docs editor session could not be measured
without a Google account. Likewise, synthetic measurements do not provide
Google's or Thido's real-user p75 metrics. Load events also do not prove when
every editor operation becomes usable.

The anonymous `docs.google.com/document/u/0/` entry was tested separately. It
redirected to a Google Accounts sign-in page and painted in about 0.56 s, but
that is a login form rather than Google Docs and is not included in the table.

## Product lesson for Thido

Google Docs demonstrates that a large application can paint its shell quickly
while continuing to load substantial functionality afterward. Thido does not
need Google's payload or complexity; it needs Google's directness and
consistency.

The priority remains:

1. render the anonymous experience directly at `/`;
2. separate public rendering from authenticated layout and cookie work;
3. preserve Thido's small payload while reducing unused prompt-form code;
4. set a clean-session median FCP target of **1.1 s or better** for the public
   root;
5. validate the result with real-user Speed Insights rather than relying only
   on lab runs.

If the root-route work reproduces the current direct-page performance, Thido
should be competitive with Google Docs on first paint while retaining a major
advantage in total transfer and completion time.
