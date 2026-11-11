import { expect, test } from "@playwright/test";

import { E2E_CRON_SECRET } from "./constants";
import { openPlan } from "./helpers";

test("the daily email is on by default, sends once a day, and can be turned off", async ({ page, request }) => {
  await openPlan(page);
  const headers = { authorization: `Bearer ${E2E_CRON_SECRET}` };

  const unauthorized = await request.get("/api/cron/daily-plan-email");
  expect(unauthorized.status()).toBe(401);

  const first = await request.get("/api/cron/daily-plan-email", { headers });
  // The mock AI writes the notes; a failed AI call would still send, with withNotes 0.
  expect(await first.json()).toMatchObject({ recipients: 1, sent: 1, withNotes: 1 });
  const second = await request.get("/api/cron/daily-plan-email", { headers });
  expect(await second.json()).toMatchObject({ recipients: 1, sent: 0 });

  await page.goto("/settings");
  const setting = page.getByLabel("Daily email");
  await expect(setting).toHaveValue("true");
  await setting.selectOption("false");
  await expect(page.getByText("Settings saved")).toBeVisible();
  try {
    const off = await request.get("/api/cron/daily-plan-email", { headers });
    expect(await off.json()).toMatchObject({ recipients: 0, sent: 0 });
  } finally {
    await page.reload();
    await page.getByLabel("Daily email").selectOption("true");
    await expect(page.getByText("Settings saved")).toBeVisible();
  }
});
