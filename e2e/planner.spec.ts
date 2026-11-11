import { expect, test } from "@playwright/test";

import { localDay, openPlan, typeTaskForToday } from "./helpers";

test.describe("plan", () => {
  test("signing in opens the plan on today, with no task entry bar", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/plan$/);
    await expect(page.getByRole("heading", { name: "My plan", level: 1 })).toBeVisible();
    await expect(page.locator(`.ProseMirror [data-type="day-header"][data-date="${localDay()}"]`)).toBeVisible();
    await expect(page.getByLabel("Add a task to a day")).toHaveCount(0);
  });

  test("moves a task to another day from its calendar button", async ({ page }) => {
    await openPlan(page);
    const editor = page.locator(".ProseMirror");
    await typeTaskForToday(page, "Water the plants");

    await editor.getByRole("button", { name: "Move to another day: Water the plants" }).click();
    const dialog = page.getByRole("dialog", { name: "Move to another day" });
    await dialog.getByRole("button", { name: "A week later" }).click();
    await expect(dialog).toBeHidden();

    const moved = editor.locator(`[data-type="day-header"][data-date="${localDay(7)}"] ~ ul li`, { hasText: "Water the plants" });
    await expect(moved).toHaveCount(1);
    await expect(editor.locator("li", { hasText: "Water the plants" })).toHaveCount(1);
  });

  test("keeps a project's to-do list of its own, apart from the days", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openPlan(page);
    const editor = page.locator(".ProseMirror");
    const outline = page.getByRole("complementary", { name: "Document outline" });
    const expand = outline.getByRole("button", { name: "Expand outline" });
    if (await expand.isVisible()) await expand.click();

    const projects = outline.getByRole("navigation", { name: "Projects" });
    await projects.getByLabel("New project name").fill("Home move");
    await projects.getByRole("button", { name: "Add", exact: true }).click();

    // The cursor lands in the project's first task.
    await page.keyboard.type("Order boxes");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Book movers");

    const header = editor.locator('[data-type="project-header"]', { hasText: "Home move" });
    await expect(header).toBeVisible();
    await expect(header.locator("~ ul li", { hasText: "Order boxes" })).toHaveCount(1);
    await editor.locator("li", { hasText: "Order boxes" }).locator('input[type="checkbox"]').check();
    await expect(projects.getByRole("button", { name: /Home move/ })).toContainText("1/2");

    // A task moved to a new day lands with the days, not inside the project.
    await typeTaskForToday(page, "Feed the cat");
    await editor.getByRole("button", { name: "Move to another day: Feed the cat" }).click();
    await page.getByRole("dialog", { name: "Move to another day" }).getByRole("button", { name: "Next day" }).click();
    await expect(editor.locator(`[data-type="day-header"][data-date="${localDay(1)}"]`)).toBeVisible();
    await expect(header.locator("~ ul li", { hasText: "Feed the cat" })).toHaveCount(0);
    await expect(projects.getByRole("button", { name: /Home move/ })).toContainText("1/2");
  });

  test("keeps the outline in place while the plan scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openPlan(page);
    const outline = page.getByRole("complementary", { name: "Document outline" });
    await expect(outline).toBeVisible();
    await page.locator(".ProseMirror").evaluate((editor) => {
      editor.insertAdjacentHTML("beforeend", Array.from({ length: 80 }, (_, line) => `<p>Line ${line}</p>`).join(""));
    });
    await page.mouse.wheel(0, 1500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    const box = await outline.boundingBox();
    expect(box && box.y).toBeGreaterThanOrEqual(0);
    expect(box && box.y).toBeLessThan(400);
  });
});
