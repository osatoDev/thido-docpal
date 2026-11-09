import { expect, test, type Page } from "@playwright/test";

import { openPlan } from "./helpers";

async function addTask(page: Page, text: string) {
  const planner = page.getByTestId("planner-bar");
  await planner.getByLabel("Add a task to a day").fill(text);
  await planner.getByRole("button", { name: "Add", exact: true }).click();
  await expect(planner.getByRole("status")).toContainText("Added");
  // Save now rather than waiting out the autosave delay.
  await page.keyboard.press("ControlOrMeta+s");
  await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();
}

test.describe("editing the plan in more than one place", () => {
  test("an edit in another browser pauses this one until Reload", async ({ browser, page }) => {
    await openPlan(page);
    // Start from a saved plan, so neither window adds today's day on its own.
    await addTask(page, "Warm up");
    const otherContext = await browser.newContext({ storageState: "e2e/.auth/user.json" });
    const other = await otherContext.newPage();
    await openPlan(other);

    await addTask(other, "Call the bank");

    // Found by polling, since the two browsers share nothing locally.
    const notice = page.getByRole("alert").filter({ hasText: "Your plan was edited in another window." });
    await expect(notice).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".ProseMirror")).toHaveAttribute("contenteditable", "false");
    await expect(page.getByTestId("planner-bar")).toHaveCount(0);

    await page.getByRole("button", { name: "Reload", exact: true }).click();
    await expect(notice).toBeHidden();
    await expect(page.locator(".ProseMirror li", { hasText: "Call the bank" })).toHaveCount(1);
    await expect(page.locator(".ProseMirror")).toHaveAttribute("contenteditable", "true");

    // The browser that made the edit was never paused.
    await expect(other.getByRole("alert").filter({ hasText: "edited in another window" })).toHaveCount(0);
    await otherContext.close();
  });

  test("another tab in the same browser pauses at once", async ({ context, page }) => {
    await openPlan(page);
    await addTask(page, "Stretch");
    const tab = await context.newPage();
    await openPlan(tab);

    await addTask(tab, "Renew passport");
    // Well under the polling interval: the tab announces its save.
    await expect(page.getByText("Your plan was edited in another window.")).toBeVisible({ timeout: 2_000 });
    await tab.close();
  });
});
