import { expect, test } from "@playwright/test";

// The marketing landing page is for signed-out visitors.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("marketing landing and onboarding", () => {
  test("shows what Thido is and what is coming", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Organize your life with Thido" }),
    ).toBeVisible();
    await expect(page.getByText("Key features")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Telegram, Google Calendar and Microsoft Outlook",
      }),
    ).toBeVisible();
  });

  test("'Get started free' reaches the register page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Get started free" }).first().click();

    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: "Start your first plan." }),
    ).toBeVisible();
  });

  test("the retired /try page redirects to sign-up", async ({ page }) => {
    await page.goto("/try");

    await expect(page).toHaveURL(/\/register/);
  });
});
