# Google Docs feature expectations missing from Thido

**Assessment date:** 2 August 2026

**Implementation update:** The repository now includes bounded durable version
snapshots with preview and non-destructive restore, revision-based stale-write
protection, `.docx` import/export, and server-generated PDF downloads. Live
operation merging, shared cursors, and collaborator presence are deliberately
deferred and are not part of the current Priority 0 scope.

## Purpose

Thido describes its editor as Google-Docs-like, so users will bring a familiar
set of expectations even when those capabilities are not part of Thido's core
AI value proposition. This document identifies the most important gaps between
those expectations and the behavior evidenced in the current Thido repository.

This is not a recommendation to reproduce every Google Docs feature. The goal
is to protect user trust and remove avoidable friction while keeping Thido
focused on AI-assisted drafting, feedback, and revision.

## Executive summary

The most consequential gaps identified in the initial audit were:

1. **Version history and recovery — implemented in the repository.** Users can
   inspect and restore bounded snapshots, including changes made by AI and
   collaborators.
2. **Conflict-safe editing — implemented.** Revision preconditions prevent
   silent overwrites and provide visible recovery. Google-Docs-style live
   presence, shared cursors, and operation merging are deliberately deferred.
3. **Document portability — implemented for the current schema.** Authenticated
   users can import and export Word files and download server-generated PDFs;
   imports report unsupported structures.
4. **Everyday document structures.** Safe links, small tables, checklists,
   document outlines, stable section links, tables of contents, and footnotes
   are implemented. Bookmarks and advanced page elements remain missing.
5. **Everyday writing utilities.** Find and replace, word counts, explicit
   document language, browser spelling suggestions, and text direction are
   implemented. A product-level grammar review remains future work.
6. **Mature review workflows.** Thido has comments and AI proposals, but not a
   general human suggestion mode, assignments, mentions, comment notifications,
   or a consolidated review history.

The first three areas are trust and adoption requirements, not editor polish.
The defined Priority 0 repository scope is implemented. Real-time simultaneous
editing is recorded as deferred future work rather than an activation blocker.

## What Thido already supports

The current product is not a blank editor. It already provides:

- automatic persistence after title or content changes;
- bold, italic, strikethrough, three heading levels, disc/circle/square bullet
  lists, numbered lists, blockquotes, undo, and redo;
- inserted document images;
- browser printing with a document-focused print layout;
- read-only public links and direct collaborator access at view, comment, edit,
  and full-access levels;
- invitation emails for direct collaborators;
- anchored and whole-document comments, replies, resolution, and an archive;
- AI-generated drafts, AI comment responses, and proposed or automatically
  applied AI changes.

Those strengths should remain visible in positioning. The issue is that the
surrounding document workflow still lacks several capabilities users consider
basic once a draft becomes important or collaborative.

## Current gap matrix

| Expected capability | Thido status | Why users notice |
| --- | --- | --- |
| Autosave | Present | Core content and title changes are saved automatically. |
| Undo and redo | Partial | Available in the active editor session, but not as durable recovery after closing or overwriting a document. |
| Rich text, alignment, and headings | Present | Includes common inline marks, typography and color controls, code, four-way alignment, indentation, paragraph spacing, lists, and headings 1–6. |
| Images | Present | Images can be inserted and rendered in private and public views. |
| Printing | Present | A print-specific layout is available, including browser PDF output. |
| Sharing permissions | Present | Direct view, comment, edit, and full access plus public read-only links are supported. |
| Comments | Partial | Threads, replies, resolution, and AI responses exist; assignments, mentions, notifications, filtering, and review dashboards do not. |
| Suggested edits | Partial | AI suggestions can be accepted or rejected; humans cannot enter a general track-changes or suggesting mode. |
| Version history | Present in repository; migration required | Bounded snapshots record source and actor, provide formatted previews, and can be restored without deleting later history. Named versions and visual diffs remain future enhancements. |
| Simultaneous editing | Safeguarded, live merging deferred | Revision preconditions prevent silent stale overwrites and provide a reload path. Live presence, shared cursors, and operation-level merging are outside the current scope. |
| Word import/export | Present for the supported schema | Users can import `.docx` with fidelity warnings and download editable Word files. Unsupported Word structures are reported rather than presented as fully preserved. |
| PDF export | Present | Users can download a server-generated PDF or use the browser print workflow. |
| Links and bookmarks | Partial | Safe HTTP(S) and email links can be added, edited, opened, copied, removed, pasted, and exported. Headings receive stable anchors with copyable section URLs; arbitrary internal bookmarks remain unavailable. |
| Tables and checklists | Present for the initial scope | Users can create checklists and small resizable tables, then add or delete rows and columns. Advanced table styling and semantic Word checklist round trips remain future work. |
| Find and replace | Present | Editor-aware search supports navigation, case matching, replace, and replace all. |
| Spelling, grammar, and word count | Partial | Document and selection counts, explicit language, writing direction, and a persisted browser-spellcheck toggle are present. A dedicated grammar-review service is not. |
| Outline and table of contents | Present for the initial scope | A collapsible outline navigates to stable heading anchors, copies section URLs, and supports insertable tables of contents that refresh when headings change. Arbitrary bookmarks and document tabs remain future work. |
| Page layout and references | Partial | Page breaks and linked, automatically numbered footnotes persist and render in sharing and export; margins, headers, footers, page numbers, and sections remain unavailable. |
| Offline editing | Missing | Documents require an online application and server persistence. |
| Document tabs and smart building blocks | Missing | Advanced organization and Workspace-style integrations are not present. |

## Priority 0: trust, safety, and portability

### 1. Durable version history and restore

**Repository status:** Implemented. Production activation requires the
`20260802190000_add_document_revisions` migration and browser verification.

Google Docs lets editors inspect who changed a document, view earlier versions,
and restore one. This is a core safety net rather than an advanced collaboration
feature ([Google Docs Editors Help: version history](https://support.google.com/docs/answer/190843)).

Before this work, Thido stored only the latest document JSON and an `updatedAt`
timestamp. The new revision model adds durable recovery beyond editor-session
undo/redo.

Minimum useful Thido scope:

- create durable revisions at bounded intervals and before every AI-applied
  whole-document change;
- record actor, source (`USER`, `AI`, or system), timestamp, and revision parent;
- show a readable timeline with preview and restore;
- create a new revision when restoring instead of deleting later history;
- retain revisions under an explicit storage and retention policy.

This should precede aggressive AI auto-application and broad collaborative
editing. Users will tolerate an imperfect formatter more readily than an
irrecoverable document change.

### 2. Conflict-safe collaborative editing

**Repository status:** Implemented for the current scope. Optimistic concurrency
and visible stale-write recovery cover user saves, AI changes, suggestion
acceptance, imports, and restores. Operation-based real-time merging and
presence are deliberately deferred.

Google's collaboration model sets an expectation that multiple permitted users
can work in the same file and receive one another's changes. Google documents
support up to 100 simultaneous participants in common sharing scenarios
([Google Workspace Learning Center: document sharing basics](https://support.google.com/a/users/answer/9305685)).

Thido's permissions control who may edit, and the editor still sends debounced
whole-content updates. Those updates now carry revision preconditions, so stale
copies are rejected instead of silently overwriting newer work. A merge protocol
and live presence are still absent.

Minimum useful Thido scope:

- immediately add optimistic-concurrency protection using a document revision
  number or `updatedAt` precondition;
- reject stale writes with a clear compare/reload/retry experience;
- if simultaneous editing becomes a product requirement, adopt operation-based
  collaboration through a supported ProseMirror stack with presence and shared
  selections;
- make AI changes participate in the same revision stream rather than bypassing
  collaboration rules;
- test multi-tab and multi-user edits, disconnections, reconnects, and AI edits.

Optimistic conflict detection is the short-term safety requirement. Live
cursors are valuable, but should not be shipped before updates are merge-safe.

### 3. Word import and Word/PDF export

**Repository status:** Implemented for Thido's current document schema. Word
imports return fidelity notes for unsupported content; Word and PDF downloads
are authenticated and rate-limited. Production browser and representative-file
verification remain open. The exact supported and unsupported structures are
recorded in the [Word import/export fidelity contract](./word-import-export.md).

Google Docs lets users download a file in a chosen format, and its Word
interoperability maps tracked changes to suggestions
([download documentation](https://support.google.com/docs/answer/49114),
[Word-to-Docs guidance](https://support.google.com/docs/answer/9310150)).

Thido now supplements pasting and browser printing with `.docx` import, editable
`.docx` export, and explicit server-generated PDF download. The remaining
portability work is broader schema fidelity—particularly advanced table
styling, semantic checklists, footnotes, and tracked changes—rather than the
absence of a file workflow.

Recommended sequence:

1. **Done:** add explicit **Download PDF** and **Download Word (.docx)** actions.
2. **Partly done:** add `.docx` import with explicit replacement confirmation
   and fidelity notes; a pre-commit visual preview remains future work.
3. **Done for the current schema:** preserve supported headings, paragraphs,
   emphasis, links, lists, basic tables, and images in both directions.
   Footnotes and richer table styling depend on adding those editor features
   first.
4. **Done:** report unsupported structures instead of presenting them as fully
   preserved.
5. **Deferred deliberately:** treat Google/Word comments and tracked changes as
   a separate later import phase.

## Priority 1: baseline authoring expectations

### 4. Links, tables, and checklists

**Repository status:** Implemented for the recommended initial scope. The
shared editor schema now preserves safe links, task lists, and tables across
editing, read-only/public rendering, print, and supported import/export paths.
Bookmarks and advanced table layout remain future work.

Links are among the most basic expectations of a web document. Google Docs also
supports internal bookmarks for navigation
([links and bookmarks](https://support.google.com/docs/answer/45893)). Thido's
editor schema currently disables TipTap's link mark, so pasted or generated
links cannot be represented reliably.

Tables are similarly routine for briefs, comparisons, agendas, specifications,
and client deliverables. Google Docs supports inserting, resizing, styling, and
reordering table rows and columns
([tables](https://support.google.com/docs/answer/1696711)).

Recommended initial scope:

- **Done:** safe HTTP(S) and email links with edit, open, copy, and remove
  actions;
- **Done:** small accessible tables with row/column insertion and deletion;
- **Done:** checklists as a distinct list type;
- **Done for Thido and supported HTML:** copy/paste schema preservation for all
  three structures;
- **Covered in repository tests:** public-view schema and Word/PDF rendering;
  interactive browser verification remains on the production checklist.

### 5. Find and replace, word count, and writing review

**Repository status:** Find and replace, document/selection counts, explicit
document language, left-to-right/right-to-left direction, and a persisted
browser-spellcheck toggle are implemented. Thido does not claim a dedicated
grammar-review engine.

Google Docs provides editor-aware find and replace, including replace-all and
case-sensitive matching ([find and replace](https://support.google.com/docs/answer/62754)).
It also exposes word and character counts, including a count while typing
([word count](https://support.google.com/docs/answer/39003)), plus a spelling
and grammar review workflow
([spelling and grammar](https://support.google.com/docs/answer/57859)).

Current scope:

- **Done:** Find, Replace, and Replace all with visible match count,
  case-sensitive matching, and keyboard access;
- **Done:** document and selection word/character counts;
- **Done:** an explicit language setting;
- **Done:** a consistent persisted spellcheck policy that deliberately relies
  on the browser's native spelling suggestions;
- **Done:** accessible status announcements for match counts and navigation.

These utilities are especially important for long AI-generated drafts, where a
user may need to check length, terminology, names, or repeated phrases quickly.

### 6. Outline, table of contents, and internal navigation

**Repository status:** The collapsible outline, click-to-scroll navigation,
stable heading IDs, copyable section URLs, hash navigation, and insertable,
automatically refreshed table of contents are implemented for headings 1–6.
Arbitrary bookmarks and document tabs remain future work.

Thido supports headings but does not use them as navigation. Google Docs derives
a document outline from headings and lets users jump between sections
([document outline](https://support.google.com/docs/answer/6367684)). It also
supports document tabs and nested subtabs for larger documents
([document tabs](https://support.google.com/docs/answer/15499791)).

Recommended Thido scope:

- **Done:** a collapsible heading outline with click-to-scroll;
- **Done:** heading IDs that remain stable enough for internal links;
- **Done:** insertable table of contents with automatic and explicit refresh;
- **Done for headings:** copyable links to a section; arbitrary bookmarks remain
  future work;
- defer Google-style document tabs until evidence shows that Thido users create
  documents large enough to require them.

### 7. Page structure and references

**Repository status:** Persistent page breaks and linked, automatically numbered
footnotes are implemented in the editor, shared view, Word export, and PDF
export. The remaining page-reference features are future work.

Google Docs supports paged and pageless modes. In paged documents, users can add
headers, footers, page numbers, section-specific variants, and footnotes
([page elements and footnotes](https://support.google.com/docs/answer/86629)).

Thido's current document is a continuous canvas with print CSS. That is suitable
for early drafting but not for polished reports, academic work, contracts, or
formal proposals.

Recommended order:

1. **Done:** page breaks and linked footnotes with backlinks;
2. predictable print/PDF pagination;
3. headers, footers, and page numbers;
4. margin, paper-size, and orientation controls only if user demand warrants
   the added layout complexity.

## Priority 2: collaboration workflow maturity

### 8. Human suggestion mode

Google Docs lets people suggest edits without changing the accepted document;
the owner can accept or reject each suggestion, and Office tracked changes can
round-trip as suggestions
([suggested edits](https://support.google.com/docs/answer/6033474)).

Thido has a strong AI proposal model, but collaborators cannot use the same
review pattern for their own edits. Comment-only access is not equivalent: a
reviewer must describe the change instead of drafting it in place.

A coherent implementation should reuse one review vocabulary for AI and human
changes where possible:

- author-attributed insertions and deletions;
- accept/reject individually and in bulk;
- optional explanation thread;
- filtering by author and status;
- durable inclusion in version history;
- tracked-change conversion during future `.docx` import/export.

### 9. Mentions, assignments, notifications, and comment discovery

Google Docs comments can be assigned as action items, reassigned, completed,
searched, filtered, and directed to a person using a mention; assignment also
notifies the recipient
([comments and action items](https://support.google.com/docs/answer/6239410)).

Thido supports comment threads and resolution, but collaboration will feel
passive as teams grow because there is no ownership or notification loop.

Recommended scope:

- mention collaborators in comments;
- assign and reassign a thread;
- notify on assignment, direct mention, reply, and access change;
- provide per-user notification preferences and unsubscribe controls;
- add filters for assigned to me, mentions, unresolved, resolved, human, and AI;
- add an inbox or dashboard signal for documents needing the current user's
  response.

## Priority 3: useful, but not required for initial credibility

### 10. Offline access

Google Docs supports creating, viewing, and editing selected files offline, then
syncing after reconnection
([offline access](https://support.google.com/docs/answer/6388102)). Thido has no
offline mode. This matters for travel and unreliable connections, but it should
follow versioning and conflict-safe synchronization because offline editing
makes both problems harder.

### 11. Templates and reusable content blocks

Thido has document starters for AI generation, which is useful but different
from reusable document templates. Users may later expect template duplication,
company styles, standard clauses, and saved blocks. Google Docs also offers an
`@` menu, smart chips, and building blocks for people, files, events, meetings,
and project workflows
([`@` menu](https://support.google.com/docs/answer/11276813),
[building blocks](https://support.google.com/docs/answer/15740443)).

Thido should prioritize plain reusable templates before ecosystem-specific
smart chips. Templates reinforce its drafting proposition; calendar and project
integrations do not need to be copied without demonstrated demand.

### 12. Voice typing and dedicated mobile editing

Google Docs provides voice typing and voice editing in supported browsers
([voice typing](https://support.google.com/docs/answer/4492226)) and mature mobile
apps. Thido should first ensure the responsive web editor is reliable for
viewing, commenting, and modest edits. Native apps and voice commands are later
investments unless target-user research identifies them as essential.

## Recommended delivery sequence

### Foundation release

- optimistic concurrency and stale-write protection;
- durable version history with AI checkpoints and restore;
- explicit Word and PDF downloads;
- links (done);
- find/replace and word count (done).

### Authoring release

- `.docx` import with a fidelity preview;
- tables and checklists (done for the initial scope);
- outline, internal links, and table of contents (done for headings);
- footnotes (done for Thido documents and compatible export fallbacks);
- consistent spellcheck/language behavior (done using browser spellcheck).

### Collaboration release

- operation-based real-time editing and presence;
- human suggestion mode unified with AI proposal review;
- mentions, assignments, notifications, and comment filters;
- richer audit attribution in version history.

### Expansion release

- headers, footers, page numbers, and advanced page setup;
- reusable document templates and content blocks;
- offline access;
- document tabs, smart integrations, voice workflows, and native apps only when
  usage evidence supports them.

## Product principle

Thido should aim for **document trust parity**, not feature-count parity.
Recovery, conflict safety, portability, links, structured content, and review
workflows make users comfortable moving serious work into the product. Advanced
Workspace integrations are optional. Thido's differentiator should remain the
quality and control of AI-assisted creation and revision—not the absence of
basic document safeguards.
