# Neon 5 GB usage investigation

> Historical baseline before the local autosave changes: debounce is now 120 seconds with visible countdown/save progress, and redundant content results have been reduced. See [current changes and remaining full-content uploads](./autosave-payload-decisions.md). These changes have not been deployed.

Investigated 27 September 2026 using the Neon alert email, authenticated Vercel APIs, read-only SQL against the locally configured Neon database, and application source.

## What the notification means

The alert sent at 11:13 UTC says **4 GB of the 5 GB monthly public network transfer allowance** has been used by `thido_docpal_db` (`twilight-tree-71458193`). This is data sent out of Neon, including database query results, rather than the size of stored documents. Repeatedly fetching the same document counts repeatedly. See the [original notification](https://mail.google.com/mail/u/?authuser=osatog1%40gmail.com#all/1a0e291d0275bfd3) and [Neon's definition of public network transfer](https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md).

Vercel's storage API confirms that this exact Neon project is attached to `thido-docpal` for **production and preview**, on the Free plan. Its latest production deployment is `dpl_3VPwhMpgbTcKt7fZYFaVc5Aq5vdo`, commit `6db860b7f90a32c301f851223a37f99784499009`. The autosave, authorization, and revision files inspected match that commit.

## Itemized causes

These are identified transfer mechanisms, ranked by available evidence—not an accounting allocation of the 4 GB. Historical bytes per query were not recorded in the available database statistics.

| Contributor | What causes outbound transfer | Evidence and magnitude |
| --- | --- | --- |
| **1. Full-document reads during every autosave** | The authorization helper fetches the entire document, then the save transaction fetches its content again. | Two document-sized query results before the update. The editor saves after a **600 ms pause** in editing. |
| **2. Full-document results from save writes** | `document.update()` returns the full document; revision `create()` or `update()` returns another full snapshot despite the caller ignoring that result. | Two more document-sized results. Combined with item 1, a typical successful owner save transfers approximately **four copies of the document content** from Neon. A 200 KB document therefore produces roughly 800 KB of database egress per save, excluding other fields and protocol overhead. |
| **3. AI status polling includes document content** | While waiting for a comment AI job to unlock the document, the editor polls the comments endpoint every **1.25 seconds**. That endpoint selects and returns document content, comments, replies, and suggestions. | At 200 KB per document, a continuously waiting minute would fetch roughly **9.6 MB** of document content, plus comments and overhead. This is a conditional example, not measured monthly polling volume; it does not run continuously during ordinary editing. |
| **4. Document opens, refreshes, exports, and other authorized operations** | The document GET fetches content plus prompt answers and comments. The shared authorization helper also fetches full content wherever used. | Verified code paths; their monthly request counts and bytes are unavailable. |
| **5. Preview and local development traffic** | Vercel connects both production and preview to the same Neon project. Local `.env` also connects to Neon. | These can contribute to the same project allowance. The Vercel response did not expose resolved connection values, so identical production/local endpoints and preview branch isolation were **not independently verified**. No separate byte allocation is available. |
| **6. Smaller application queries** | Authentication, settings, dashboard metadata, feedback, AI accounting, and comment queries return data too. | Real contributors, but no evidence they dominate this alert. The available data strongly points toward repeated large-document transfers. |

The browser upload of edited content is inbound to Neon and is not itself the outbound usage described here. The full response Vercel sends to the browser is a separate network leg; it should not be added again to the Neon total.

Source locations: [autosave and polling](../src/components/editor/TiptapEditor.tsx), [document save route](../src/app/api/documents/[id]/route.ts), [authorization helper](../src/lib/documentAuth.ts), [revision persistence](../src/lib/documentRevisions.ts), and [comments polling response](../src/app/api/documents/[id]/comments/route.ts).

## Measured database evidence

The local configuration points to endpoint `ep-empty-hat-auin02ss` in AWS us-east-1, database `neondb`. These figures describe that endpoint; Vercel confirms the project association above, but its secret-backed environment responses did not allow direct endpoint comparison.

| Measurement | Observed value |
| --- | ---: |
| Whole database physical size | 54,853,632 bytes (54.85 MB) |
| Current documents | 48 |
| Current document JSON text combined | 2,095,948 bytes (2.10 MB) |
| Largest current document JSON | 452,337 bytes (452 KB) |
| Sum of current document revision counters | 12,598 |
| Documents above 100 KB | 7 |
| Revision counters belonging to those 7 documents | 12,278 (97.5% of the total) |
| Stored revision snapshots | 1,374 |
| Revision JSON text combined, uncompressed | 160,357,862 bytes (160.36 MB) |
| Revision table physical size, including indexes/TOAST | 43,196,416 bytes (43.20 MB) |
| PostgreSQL recorded document updates | 14,248 |
| PostgreSQL recorded revision updates / inserts | 11,409 / 1,413 |

The physical database is smaller than the uncompressed JSON totals because PostgreSQL can compress large values. Physical storage size is not a measure of repeated query-result transfer.

As a **scale estimate only**, summing `current document JSON bytes × revision counter` gives **2.01 GB for one copy per revision**, of which 2.006 GB belongs to the seven large documents. Four copies would be approximately **8.05 GB across those revision histories**. This is not a measurement of September usage: document sizes changed over time, revision counters include different kinds of changes, deleted documents are absent, and the inspected code may not have been deployed throughout that history. It does show that the observed edit activity and save design can plausibly produce gigabytes of transfer even with very few documents.

## What cannot be attributed exactly

Only `plpgsql` is installed; `pg_stat_statements` and its reset information are unavailable. Table counters are cumulative and have no usable monthly reset timestamp. They do not record network bytes or distinguish production, preview, and development. No logical replication slots were present on the inspected endpoint; only physical slots were listed.

Consequently, there is no defensible way to say “autosave used X GB and polling used Y GB” for this month from these observations. The 4 GB total is confirmed by the alert, while the ranking above combines live aggregate evidence and verified application behavior. No document bodies, account details, or credentials were exported for this audit.

## Changes to prioritize

1. **Stop returning unused revision bodies.** Add a minimal `select` to revision writes, such as `{ id: true }`. This removes approximately one of the four content copies on the normal save path without changing saved history.
2. **Make authorization reads operation-specific.** Fetch metadata only where content is unnecessary; consolidate content reads on the save path while preserving permissions, locking, conflict detection, and revision correctness.
3. **Make AI polling lightweight.** Poll job status/revision only, then fetch updated document content once when needed. Pause or back off when appropriate.
4. **Review autosave frequency and unchanged saves.** Preserve durability and conflict behavior while reducing unnecessary requests. Returning only revision/title to the browser also reduces Vercel response traffic, but alone does not eliminate Neon queries already performed.
5. **Measure future usage by environment and operation.** Verify local/preview branch isolation, capture content-free request and payload-size counters, and consider query statistics for call attribution. Query statistics alone will not provide exact billed network bytes.
6. **Monitor the remaining allowance.** The email establishes 1 GB remaining at notification time, not the current balance. If usage continues before reset, review the live [Neon project usage](https://console.neon.tech/app/projects/twilight-tree-71458193). Paid plans currently include 500 GB monthly transfer, but upgrading capacity does not remove the redundant reads. [Neon plan announcement](https://neon.com/blog/more-data-transfer-on-paid-plans).

This investigation changed documentation only. It did not delete data, reset counters, enable extensions, deploy code, or change the billing plan.
