# End-to-end tests

Playwright specs for the major user workflows, runnable on command.

```bash
npm run test:e2e        # headless, all specs
npm run test:e2e:ui     # Playwright UI mode
npx playwright test e2e/editing.spec.ts   # one file
npx playwright show-report                # last HTML report
```

## What is covered

| Spec | Flow |
| --- | --- |
| `e2e/auth.setup.ts` | Signs in the seed user via the local test-login form and saves the session (a dependency of the other specs). |
| `e2e/history.spec.ts` | Ten-entry history pages, Show more beyond 100 versions, single-snapshot preview/retry, restore, owner retention choice, and signed-out/non-owner access restrictions. |
| `e2e/autosave.spec.ts` | Five-second debounce/reset, countdown and save progress, metadata-only save responses, newer edits during an in-flight save, failure/retry, unsaved navigation warnings, and stale conflicts. |
| `e2e/editing.spec.ts` | Open a document, type and autosave, reload and confirm persistence, bold/heading formatting, and **View > Side margins** changing and persisting. |
| `e2e/comments-ai.spec.ts` | Select a passage, queue a comment, action it with Thido, see the working lock, and the applied revision. |
| `e2e/landing.spec.ts` | The signed-out marketing page renders (hero, "what Thido does", story cards) and its CTAs reach `/try` and `/register`. |

## How the stack is wired (`playwright.config.ts`)

- **Database.** `e2e/global-setup.ts` stands up a throwaway Postgres, runs
  `prisma migrate deploy`, and seeds one beta user + one READY document
  (`e2e/seed.ts`). It **refuses to run** against a URL that looks hosted
  (`neon.tech`, RDS, Supabase).
  - Default: a Docker container (`postgres:16-alpine`, port 55432) when the
    Docker daemon is reachable.
  - Otherwise: a local server via `pg_ctl` in `e2e/.pgdata` (needs Postgres 16
    client/server binaries on `PATH`, e.g. Postgres.app).
  - Override: set `E2E_DATABASE_URL` to a Postgres you manage; setup then skips
    both and only migrates + seeds. `E2E_KEEP_DB=1` keeps the database up after
    the run.
- **App under test.** `next dev` on port 3100 with `ENABLE_TEST_LOGIN=true`, the
  seed database, and `ANTHROPIC_BASE_URL` pointed at the mock below.
  `next.config.ts` allows the `127.0.0.1` dev origin so client hydration works.
- **AI.** `e2e/ai-mock-server.mjs` (port 54321) answers `POST /v1/messages`.
  It inspects the system prompt and returns a canned structured payload:
  a comment-batch revision, or planning follow-up questions. Streaming
  (document generation) is not implemented and returns 501; add it there if a
  spec needs it.

## Updating

- **Seed data**: `e2e/seed.ts` (`SEED` identities live in `e2e/constants.ts`).
- **AI responses**: `cannedPayload()` in `e2e/ai-mock-server.mjs`.
- **New spec**: add `e2e/<name>.spec.ts`; it inherits the authenticated session.
  For a signed-out spec, add `test.use({ storageState: { cookies: [], origins: [] } })`.

## Not wired into CI yet

`docs/production-todo.md` tracks adding `npm run test:e2e` to the pull-request
workflow (it needs Docker or a Postgres service container available to CI).

For the retention deletion safeguards against the isolated local PostgreSQL database (after the e2e migrations/setup), run:

```bash
HISTORY_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/thido_e2e npx vitest run src/lib/documentHistoryRetention.integration.test.ts
```

These tests reject non-local hosts, use their own temporary user/documents, and send no emails. Without that environment variable they are skipped by the ordinary unit-test run.
