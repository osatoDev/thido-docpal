# Document navigation feedback

No—an inline **“Opening…”** label is useful as a fallback, but it is not the
best primary experience for opening a document.

## Recommended experience

When someone clicks a document title:

1. The destination should react immediately.
2. The dashboard should transition to a lightweight editor-shaped skeleton.
3. The real title, editor, and comments should replace that skeleton as soon as
   they arrive.
4. If loading takes unusually long, the skeleton can add a quiet status message
   such as **“Opening document…”** for assistive technology and delayed requests.

Thido already has the route-level editor skeleton needed for this pattern. The
inline label was added to cover cases where navigation has not started quickly
enough, especially during development when Next.js prefetching is disabled.

## Why the inline label is weaker

- It keeps the user visually anchored to the old dashboard instead of moving
  them into the document context.
- It shifts attention to system activity rather than the document they chose.
- Repeating the label beside a title can make a dense document list feel noisy.
- On fast navigations it may flash too briefly to be useful.
- It confirms the click but does not make the navigation itself faster.

## Best hierarchy of feedback

The preferred order is:

1. **Instant destination skeleton** — best default.
2. **Subtle pressed or selected row state** — useful during the first frame.
3. **Thin page-level progress indicator** — useful only when requests can take
   noticeably longer.
4. **Inline “Opening…” text** — fallback for slow or non-prefetched navigation.

A spinner inside every link is not recommended. It adds visual noise and makes
the interface feel slower than it is.

## Recommendation for Thido

Remove the visible inline **“Opening…”** label and rely on the existing
document-route skeleton as the primary feedback. Add a short-lived selected-row
state on click so the interaction is acknowledged immediately, even before the
route shell appears. Keep the accessible **“Opening document…”** announcement in
the route loading state.

This gives the interaction a Google Docs-like feel: the click is acknowledged,
the interface moves into an editor-shaped destination immediately, and loading
details stay unobtrusive.

## Implemented

The visible inline **“Opening…”** label has been removed. The selected dashboard
row now receives an immediate background state, followed by the document-route
editor skeleton while fresh data loads.
