import { expect, type Page } from "@playwright/test";

import { SEED } from "./constants";

/**
 * Signs in through the local test-login form (enabled by ENABLE_TEST_LOGIN in
 * the e2e web server). Lands on `callbackUrl`.
 */
export async function signInAsSeedUser(page: Page, callbackUrl = "/plan") {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  const testLoginForm = page.locator("form", {
    has: page.getByRole("button", { name: "Continue without Google" }),
  });
  await testLoginForm.getByPlaceholder("you@example.com").fill(SEED.userEmail);
  await testLoginForm.getByPlaceholder("Name (optional)").fill(SEED.userName);
  await testLoginForm.getByRole("button", { name: "Continue without Google" }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** Opens the person's plan, which the first visit creates. */
export async function openPlan(page: Page) {
  await page.goto("/plan");
  await expect(page.getByRole("heading", { name: "My plan", level: 1 })).toBeVisible();
  await expect(page.locator(".ProseMirror")).toBeVisible();
}

/** Today's date in the browser's time zone, as YYYY-MM-DD, shifted by `offset` days. */
export function localDay(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Types a task into today's checklist the way a person would: at the end of
 * the list right under today's date, or as a new checklist ("[ ] ") when today
 * has none.
 */
export async function typeTaskForToday(page: Page, text: string) {
  const editor = page.locator(".ProseMirror");
  const header = editor.locator(`[data-type="day-header"][data-date="${localDay()}"]`);
  await expect(header).toBeVisible();
  const list = header.locator('xpath=following-sibling::*[1][self::ul[@data-type="taskList"]]');
  if (await list.count()) {
    const last = list.locator(":scope > li").last().locator("p").first();
    await last.click();
    await page.keyboard.press("End");
    if ((await last.innerText()).trim()) await page.keyboard.press("Enter");
    await page.keyboard.type(text);
  } else {
    await header.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type(`[ ] ${text}`);
  }
  await expect(editor.locator("li", { hasText: text }).first()).toBeVisible();
}

/** Opens the seeded READY document (an older document) in the editor. */
export async function openSeedDocument(page: Page) {
  await page.goto(`/documents/${SEED.documentId}/edit`);
  await expect(page.getByRole("textbox", { name: "Document title" })).toHaveValue(
    SEED.documentTitle,
  );
  await expect(page.locator(".ProseMirror")).toBeVisible();
}
