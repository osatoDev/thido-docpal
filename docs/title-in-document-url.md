# Put the first document title in the URL

## Implementation status

Implemented on 11 August 2026 using the recommended current-title policy.
The document ID remains authoritative, while the editor URL uses the optional
route `/documents/[id]/edit/[[...slug]]`. Successful title saves, imports, and
revision restores replace the current address without reloading the editor.
ID-only, missing, extra, and stale slugs canonicalize on the server. Dashboard,
recent-document, File-open, wizard, and invitation links generate the same
canonical path when they already have the title.

Document slugs are removed from founder-feedback context and Rollbar strings so
a title shown in the user's browser URL is not copied into those diagnostic
channels.

## Assessment

This is a **small-to-medium change** if the title is a descriptive URL segment and the existing document ID remains the authoritative identifier.

For example:

```text
/documents/cmg123/edit
```

would become, after the first non-placeholder title is successfully saved:

```text
/documents/cmg123/edit/project-proposal
```

No database migration was needed because the slug is derived from the current
title rather than stored as a separate identity.

Using only the title as the identifier, such as `/documents/project-proposal`, would be substantially more work and is not recommended. Titles are mutable, non-unique, and sometimes blank.

## Why it fits the current application

The existing editor already has nearly all of the state needed:

- Documents have stable IDs and are loaded from `/documents/[id]/edit`.
- The save API returns the saved document after a successful title update.
- The editor distinguishes placeholder titles from real titles and tracks user-set titles with `titleManuallySet`.
- Automatically inferred titles are also persisted through the same save path.
- The authenticated route matcher already accepts trailing paths after `/documents/:id/edit`.

The main work is therefore URL and route handling, not data modelling.

## Recommended behavior

1. Keep the document ID in the URL and treat the slug as descriptive only.
2. Generate a lowercase, URL-safe slug from the first successfully persisted non-placeholder title. Collapse whitespace and punctuation to hyphens, remove leading and trailing hyphens, and use a bounded length.
3. After that save succeeds, replace the current browser URL without adding a history entry or reloading the editor. The current Next.js version supports `window.history.replaceState`, and it integrates with the App Router.
4. Make both the old ID-only URL and the slugged URL resolve to the same document so existing bookmarks continue to work.
5. Never use the slug for authorization or lookup. Ignore a stale or edited slug and resolve access exclusively through the document ID.
6. Generate slugged links from the document title on the dashboard and in other internal document links, while retaining compatibility with existing ID-only links.

The most direct route shape for this repository is an optional trailing segment under the editor route:

```text
/documents/[id]/edit/[[...slug]]
```

That permits both `/documents/cmg123/edit` and `/documents/cmg123/edit/project-proposal`. The route should accept at most one meaningful slug even if an optional catch-all is used to preserve the unslugged form.

## Meaning of “first title”

The recommended trigger is the first **persisted, non-placeholder title**, whether the user types it into the title field or the app infers it from the first heading. Waiting for the save response matters: the address bar should not advertise a title that failed to save.

Two product choices are possible after that:

- **Recommended: current-title slug.** Internal links use the latest title. The open editor updates the slug after each successful title save. Old slugged URLs still work because the ID is authoritative. This stays consistent and needs no schema change.
- **Literal first-title slug.** The initially generated slug never changes. This needs a persisted `urlSlug` (or equivalent) so the first value survives reloads, imports, AI title inference, and later renames. That makes the change medium-sized and requires a Prisma migration.

The phrase “when a title is set for the first time” sounds like the trigger for adding the slug, rather than a requirement to freeze that first title forever. The current-title option is therefore the better default.

## Files likely involved

- `src/app/documents/[id]/edit/page.tsx` and/or a new optional slug route
- `src/components/editor/TiptapEditor.tsx` for changing the URL only after a successful save
- `src/components/documents/DashboardDocumentTable.tsx` and other document-link builders
- A small shared slug utility with unit tests
- Route, proxy, and editor-save tests

## Acceptance checks

- A new untouched document retains its ID-only URL.
- A manual or inferred first title changes the URL only after a successful save.
- The editor does not reload, lose focus, reset undo history, or add a redundant Back-button entry.
- Refreshing a slugged URL opens the same document.
- Old ID-only links still open.
- Duplicate titles do not conflict.
- Unicode, punctuation-only, very long, and emoji-containing titles produce safe bounded URLs, with the ID-only URL as a valid fallback if the slug becomes empty.
- Changing a title follows the selected current-title or frozen-first-title policy.
- An incorrect or stale slug cannot bypass document permissions and does not cause a not-found result when the ID is valid.

## Bottom line

This is straightforward if the URL remains ID-based with a human-readable title suffix. It becomes needlessly difficult only if the title is made the document's unique identity.
