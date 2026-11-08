/** Shared, fixed configuration for the e2e stack. */

export const APP_PORT = 3100;
export const APP_URL = `http://127.0.0.1:${APP_PORT}`;

export const AI_MOCK_PORT = 54321;
export const AI_MOCK_URL = `http://127.0.0.1:${AI_MOCK_PORT}`;
export const E2E_CRON_SECRET = "e2e-cron-secret";

export const PG_PORT = 55432;
export const PG_CONTAINER = "thido-e2e-pg";

/**
 * The database the e2e app and seed talk to. Override with E2E_DATABASE_URL to
 * point at a Postgres you manage yourself; otherwise global-setup starts a
 * throwaway Docker container on PG_PORT.
 */
export const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  `postgresql://postgres:postgres@127.0.0.1:${PG_PORT}/thido_e2e`;

export const USES_MANAGED_DB = Boolean(process.env.E2E_DATABASE_URL);

/** Seeded identities the specs rely on. */
export const SEED = {
  userEmail: "e2e-tester@thido.test",
  userName: "E2E Tester",
  documentId: "e2edocumentseed0000000001",
  documentTitle: "Investor update",
} as const;
