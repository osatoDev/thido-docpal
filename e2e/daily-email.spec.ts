import { expect, test } from "@playwright/test";

import { E2E_CRON_SECRET } from "./constants";
import { openPlan } from "./helpers";

test("the daily email can be turned on and sends once a day", async ({ page, request }) => {
  await openPlan(page);
  await page.goto("/settings");
  const setting = page.getByLabel("Daily email");
  await setting.selectOption("true");
  await expect(page.getByText("Settings saved")).toBeVisible();

  try {
    const unauthorized = await request.get("/api/cron/daily-plan-email");
    expect(unauthorized.status()).toBe(401);

    const headers = { authorization: `Bearer ${E2E_CRON_SECRET}` };
    const first = await request.get("/api/cron/daily-plan-email", { headers });
    expect(await first.json()).toMatchObject({ recipients: 1, sent: 1 });
    const second = await request.get("/api/cron/daily-plan-email", { headers });
    expect(await second.json()).toMatchObject({ recipients: 1, sent: 0 });
  } finally {
    await page.reload();
    await page.getByLabel("Daily email").selectOption("false");
    await expect(page.getByText("Settings saved")).toBeVisible();
  }
});
