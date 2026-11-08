import { defineConfig, devices } from "@playwright/test";

import {
  AI_MOCK_PORT,
  AI_MOCK_URL,
  E2E_CRON_SECRET,
  APP_PORT,
  APP_URL,
  DATABASE_URL,
} from "./e2e/constants";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: "node e2e/ai-mock-server.mjs",
      port: AI_MOCK_PORT,
      reuseExistingServer: !isCI,
      stdout: "pipe",
    },
    {
      command: `npm run dev -- --port ${APP_PORT}`,
      url: APP_URL,
      reuseExistingServer: !isCI,
      timeout: 150_000,
      stdout: "pipe",
      env: {
        DATABASE_URL,
        DATABASE_URL_UNPOOLED: DATABASE_URL,
        ENABLE_TEST_LOGIN: "true",
        ANTHROPIC_API_KEY: "e2e-not-a-real-key",
        ANTHROPIC_BASE_URL: AI_MOCK_URL,
        AUTH_SECRET:
          process.env.AUTH_SECRET ?? "e2e-not-secret-e2e-not-secret-0123456789",
        NEXTAUTH_URL: APP_URL,
        AUTH_URL: APP_URL,
        NEXT_TELEMETRY_DISABLED: "1",
        // Never send real email from tests; emails are logged as previews.
        RESEND_API_KEY: "",
        CRON_SECRET: E2E_CRON_SECRET,
      },
    },
  ],
});
