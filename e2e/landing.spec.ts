import { expect, test } from "@playwright/test";

// The marketing landing page is for signed-out visitors.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("marketing landing and onboarding", () => {
  test("shows what Thido is with example use cases", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Think clearly. Draft confidently." }),
    ).toBeVisible();
    await expect(page.getByText("What Thido does")).toBeVisible();
    await expect(page.getByText("How people use Thido")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(3);
  });

  test("'Try Thido free' opens the brief form at /try", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Try Thido free" }).first().click();

    await expect(page).toHaveURL(/\/try$/);
    await expect(
      page.getByRole("heading", { name: "Give the draft a clear direction." }),
    ).toBeVisible();
  });

  test("'Create an account' reaches the register page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Create an account" }).first().click();

    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: "Start writing with Thido." }),
    ).toBeVisible();
  });
});
