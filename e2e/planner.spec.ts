import { expect, test } from "@playwright/test";

import { openPlan, openSeedDocument } from "./helpers";

function localDay(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

test.describe("AI planner", () => {
  test("signing in opens the plan on today, and older documents have no planner bar", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/plan$/);
    await expect(page.getByRole("heading", { name: "My plan", level: 1 })).toBeVisible();
    await expect(page.locator(`.ProseMirror [data-type="day-header"][data-date="${localDay()}"]`)).toBeVisible();
    await openSeedDocument(page);
    await expect(page.getByTestId("planner-bar")).toHaveCount(0);
  });

  test("writes a natural-language entry under its day and reviews the plan", async ({ page }) => {
    await openPlan(page);
    const editor = page.locator(".ProseMirror");
    const planner = page.getByTestId("planner-bar");

    await planner.getByLabel("Add a task to a day").fill("Dentist tomorrow 3pm");
    await planner.getByRole("button", { name: "Add", exact: true }).click();

    const header = editor.locator(`[data-type="day-header"][data-date="${localDay(1)}"]`);
    await expect(header).toBeVisible();
    await expect(editor.locator("li", { hasText: "15:00 Dentist" }).locator('input[type="checkbox"]')).not.toBeChecked();
    await expect(planner.getByRole("status")).toContainText("Added “15:00 Dentist”");

    await planner.getByRole("button", { name: "Review my day" }).click();
    await expect(page.getByRole("complementary", { name: "Plan feedback" })).toContainText("book the dentist slot first");
  });

  test("puts a repeating entry under each day it covers", async ({ page }) => {
    await openPlan(page);
    const editor = page.locator(".ProseMirror");
    const planner = page.getByTestId("planner-bar");
    await planner.getByLabel("Add a task to a day").fill("10:30 Oatmeal everyday for the next week");
    await planner.getByRole("button", { name: "Add", exact: true }).click();
    await expect(planner.getByRole("status")).toContainText("to 7 days");
    for (let offset = 0; offset < 7; offset += 1) {
      await expect(editor.locator(`[data-type="day-header"][data-date="${localDay(offset)}"]`)).toBeVisible();
    }
    await expect(editor.locator("li", { hasText: "10:30 Oatmeal" })).toHaveCount(7);
  });

  test("asks for a day when the entry has none it can place", async ({ page }) => {
    await openPlan(page);
    const planner = page.getByTestId("planner-bar");
    await planner.getByLabel("Add a task to a day").fill("Paint the shed someday");
    await planner.getByRole("button", { name: "Add", exact: true }).click();
    await expect(planner.getByRole("status")).toHaveText("Which day do you mean?");
    await expect(page.locator(".ProseMirror")).not.toContainText("Paint the shed");
  });
});
