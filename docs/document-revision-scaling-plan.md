# `DocumentRevision` scaling plan

`DocumentRevision` is a full-content snapshot table with no retention policy today.
It is the fastest-growing table in the schema and will be the first one to cause
real storage-cost and query-latency pain as usage scales. This document records
the current behavior, why it grows the way it does, and a phased plan to bound it.

## 1. How the table behaves today

Schema ([prisma/schema.prisma:320-336](../prisma/schema.prisma#L320-L336)):

```prisma
model DocumentRevision {
  id                   String                 @id @default(cuid())
  documentId           String
  revision             Int
  title                String
  content              Json?
  source               DocumentRevisionSource
  actorId              String?
  restoredFromRevision Int?
  createdAt            DateTime               @default(now())

  @@unique([documentId, revision])
  @@index([documentId, createdAt])
  @@index([actorId])
}
```

Every row stores the **entire document title and content JSON**, not a diff
against the previous revision. Row size therefore scales with document size,
not edit size, and the table's total size is roughly:

```
total size ≈ Σ over documents of (revision count × average content size for that document)
```

### Write paths (all go through `recordDocumentRevision`, [src/lib/documentRevisions.ts](../src/lib/documentRevisions.ts))

There are five call sites, one per document-mutating route:

- [src/app/api/documents/[id]/route.ts:211](../src/app/api/documents/%5Bid%5D/route.ts#L211) — `USER` source, autosave.
- [src/app/api/documents/[id]/generate/route.ts:175](../src/app/api/documents/%5Bid%5D/generate/route.ts#L175) — `AI` source, document generation.
- [src/app/api/documents/[id]/comments/action/route.ts:242](../src/app/api/documents/%5Bid%5D/comments/action/route.ts#L242) — `AI` source, one row per *batched* comment action (not per comment).
- [src/app/api/suggestions/[id]/accept/route.ts:166](../src/app/api/suggestions/%5Bid%5D/accept/route.ts#L166) — `AI` source, one row per accepted suggestion.
- [src/app/api/documents/[id]/import/route.ts:295](../src/app/api/documents/%5Bid%5D/import/route.ts#L295) — `IMPORT` source.
- [src/app/api/documents/[id]/revisions/route.ts:140](../src/app/api/documents/%5Bid%5D/revisions/route.ts#L140) — `RESTORE` source.

### The only existing mitigation: `USER`-only coalescing

`recordDocumentRevision` ([src/lib/documentRevisions.ts:20-72](../src/lib/documentRevisions.ts#L20-L72)) only
coalesces `USER`-sourced writes, and only within a fixed 2-minute window
(`USER_REVISION_WINDOW_MS`) anchored to the **original row's `createdAt`**,
which is never bumped forward by the `update`. In practice this means: a user
who edits one document continuously creates a new row roughly every 2 minutes
of wall-clock time, not one row for the whole session — an 8-hour editing
session on one document can still produce ~240 rows. `AI`, `RESTORE`, and
`IMPORT` sources never coalesce; every AI action, suggestion-accept, import,
or restore is always a brand-new full-content row.

### No retention or archival exists anywhere

There is no cron, cleanup script, or deletion path for `DocumentRevision` rows
other than `onDelete: Cascade` when the parent `Document` is deleted. Rows
accumulate forever. (Confirmed by grepping the repo for pruning/retention/cleanup
logic — none references this table.) There is also currently **no cron
infrastructure in the app at all** — `docs/production-todo.md` separately
flags the same gap for `StripeWebhookEvent` idempotency records, so standing
up a first cron mechanism is a shared prerequisite, not unique to this table.

### The read path has its own (independent) scaling bug

[src/app/api/documents/[id]/revisions/route.ts:42-55](../src/app/api/documents/%5Bid%5D/revisions/route.ts#L42-L55)
always fetches the newest 100 rows **with full `content`** and has no cursor:

```ts
const revisions = await prisma.documentRevision.findMany({
  where: { documentId: id },
  orderBy: { revision: "desc" },
  take: 100,
  select: { revision: true, title: true, content: true, /* ... */ },
});
```

Two separate problems, true today regardless of table size:

1. **Correctness gap**: any document that has already accumulated more than
   100 revisions has permanently unreachable older history in the UI — there's
   no "load more."
2. **Wasteful hot path**: opening the history panel always downloads up to 100
   full JSON content blobs, even though the panel likely only needs
   title/source/date/actor until a specific revision is opened.

## 2. Why this table specifically, and why now

- It is the only table where per-row size scales with document size (most
  other tables are small, fixed-shape rows).
- Growth is driven by three independent multipliers that all increase with
  adoption: more documents, more active editing time per document, and more
  AI actions per document (the Pro plan explicitly encourages the latter —
  up to 300 AI-credit actions/month/user, and a single comment-batch or
  generate action costs 5 credits, i.e. up to ~60 AI-authored full-content
  snapshots per user per month on top of autosave).
- JSONB rows this large put outsized pressure on autovacuum, index
  maintenance, and Postgres TOAST storage compared to the rest of the schema,
  and on Neon specifically, storage is a direct cost line.
- It compounds silently: nothing today measures or alerts on its size, so the
  first signal will likely be a slow admin query, a Neon storage bill jump, or
  the 100-row read cap becoming user-visible.

## 3. Plan

### Phase 0 — Measure, before changing behavior

Row/size growth assumptions above are reasoned from code, not from production
data. Before picking concrete retention numbers, get real distributions:

- Total row count and `pg_total_relation_size('"DocumentRevision"')` (includes
  TOAST + indexes).
- Revisions-per-document distribution (p50/p95/max) and rows created per day,
  broken down by `source`.
- Average/greatest `content` size per source (AI/RESTORE/IMPORT rows are rarer
  but may be larger on average if AI tends to touch bigger documents).

A one-off script under `scripts/` (this repo already has a `scripts/stripe/`
precedent) or an admin-only query modeled on the existing pattern in
[src/lib/ai/adminMetrics.ts](../src/lib/ai/adminMetrics.ts) is enough; this
doesn't need to be a permanent dashboard yet, just a number to size Phase 2
thresholds against.

### Phase 1 — Fix the read-path gap (independent of scale, do regardless)

This is a correctness bug today, not just a future scaling concern:

- Add cursor-based pagination to `GET /api/documents/[id]/revisions`, matching
  the existing cursor pattern already used for AI credit history
  (`getAiCreditHistory` in [src/lib/entitlements.ts](../src/lib/entitlements.ts)),
  so history beyond the newest 100 rows is reachable via "load more" instead
  of silently cut off.
- Split the list query from the content fetch: return `revision`, `title`,
  `source`, `restoredFromRevision`, `createdAt`, and `actor.name` for the list
  (all cheap, non-JSONB columns), and only fetch a given revision's `content`
  when the user opens or restores that specific revision. This shrinks every
  history-panel open regardless of how large the table ever gets.

### Phase 2 — Retention and archival (the core fix)

Introduce a tiered retention policy reflecting that not all revisions are
equally valuable to keep at full fidelity forever:

- **Never delete**: the `INITIAL` revision and each document's single latest
  revision (integrity anchors).
- **`RESTORE` and `IMPORT`**: keep indefinitely (or a long window, e.g. 2
  years) — these are rare, deliberate checkpoints and plausible support/dispute
  reference points.
- **`AI`**: full fidelity for a moderate window (e.g. 90 days), then thin to
  a sampled snapshot (e.g. one per document per day) before final deletion
  after a longer horizon.
- **`USER`** (autosave, already coalesced to ~1 row/2 min of active editing):
  full fidelity for a short window (e.g. 30 days — covers "undo something
  from last week"), then downsample to one-per-day, then one-per-week after
  ~6 months, then delete. Superseded autosave snapshots beyond that window
  have no distinct value once a coarser sample of the same period exists.

  The exact windows above are a reasonable starting proposal, not a technical
  requirement — they're a product/retention-policy call (see open questions
  below) and should be set from the Phase 0 numbers plus whatever revision
  history is actually marketed as a feature.

Implementation shape:

- A scheduled job (Vercel Cron hitting an internal secret-protected route,
  e.g. `/api/cron/prune-document-revisions`), not synchronous with any user
  request. As noted above, this is the first cron infra in the app and can be
  shared with the already-tracked `StripeWebhookEvent` cleanup need.
- Per-document, batched SQL using `ROW_NUMBER() OVER (PARTITION BY documentId,
  date_trunc('day', createdAt) ORDER BY createdAt DESC)` to pick the one
  "keeper" row per bucket and delete the rest, run in small batches (a few
  hundred to ~1000 rows at a time) with brief pauses between batches to avoid
  long-running transactions or lock contention on an active document.
- Idempotent and safe to interrupt/resume; log per-run row counts and
  duration so a regression (e.g. the job silently failing) is visible.

### Phase 3 — Structural changes (only if Phase 2 isn't enough)

Treat these as escalation options triggered by evidence from Phase 0/2
monitoring, not day-one work:

- **Move `content` off the hot table.** Keep `DocumentRevision` metadata-only
  and store the JSON blob in object storage — this codebase already has a
  precedent for exactly this split (`DocumentImage.blobUrl` stores images in
  Vercel Blob rather than inline). Shrinks the primary table's row size, which
  speeds up any scan or index-only query against it; restore/diff pays one
  extra fetch, which is fine since those are rare, deliberate actions.
- **Native Postgres partitioning by `createdAt`** (e.g. monthly range
  partitions), which turns "delete revisions older than N days" into a cheap
  `DROP PARTITION` instead of row-by-row deletes. Real migration cost — Prisma
  doesn't manage partitioned-table DDL natively, so this needs hand-written
  migration SQL and ongoing partition-maintenance tooling. Only worth it once
  retention deletes themselves (Phase 2) become the bottleneck rather than the
  steady-state row count.

### Phase 4 — Guardrails going forward

- A per-document sanity cap at write time (log/alert, not a hard block) if a
  single document's revision count or total content size crosses an unusual
  threshold — this would usually indicate a bug (e.g. a save-retry loop)
  rather than legitimate history.
- Once Phase 0's measurement exists, keep it running periodically (even a
  simple scheduled log line) so a renewed growth spike is visible before it
  becomes a storage-cost surprise, alongside the existing "storage growth
  alerts" item already tracked in `docs/production-todo.md`.
- If the privacy policy is ever made more specific about data retention
  windows, make sure it stays consistent with whatever windows Phase 2
  actually implements (today [src/app/privacy/page.tsx](../src/app/privacy/page.tsx)
  makes no specific revision-retention claim, so Phase 2 doesn't contradict
  anything currently promised — but it should be kept in sync going forward).

## 4. Suggested sequencing

Phase 1 (read-path fix) is worth doing immediately regardless of table size —
it's a correctness bug today. Phase 0 (measurement) should happen before
committing to Phase 2's specific numeric windows, but can run in parallel with
Phase 1. Phase 2 (retention) is the actual fix for unbounded growth and is the
next priority after that. Phase 3 (blob offload / partitioning) is deliberately
deferred until Phase 2 alone proves insufficient — it's real engineering cost
that isn't justified without evidence.

## 5. Open questions (product/founder decisions, not technical ones)

- Is document revision history marketed or relied upon as a feature with any
  implied retention SLA (e.g. "restore any past version"), which would
  constrain how aggressively Phase 2 can prune?
- What retention windows are acceptable for each source tier — the 30/90-day/
  2-year numbers above are a starting proposal, not a requirement.
- Should AI-sourced revisions be tied to the same retention window as the
  AI credit usage audit trail (`AiCreditCharge`, see
  [docs/ai-credit-balance-and-audit.md](./ai-credit-balance-and-audit.md)),
  which is a separate table with its own (currently also unbounded) retention?
