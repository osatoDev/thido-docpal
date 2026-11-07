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
  await expect(page.getByTestId("planner-bar")).toBeVisible();
}

/** Opens the seeded READY document (an older document) in the editor. */
export async function openSeedDocument(page: Page) {
  await page.goto(`/documents/${SEED.documentId}/edit`);
  await expect(page.getByRole("textbox", { name: "Document title" })).toHaveValue(
    SEED.documentTitle,
  );
  await expect(page.locator(".ProseMirror")).toBeVisible();
}
