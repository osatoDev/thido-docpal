import { expect, test } from "@playwright/test";
import { APP_URL } from "./constants";

test("spreadsheet conflicts preserve formulas in a download before reload", async ({ page }) => {
  const created = await page.request.post("/api/new-document", {
    headers: { origin: APP_URL },
    form: { kind: "spreadsheet" },
    maxRedirects: 0,
  });
  expect(created.status()).toBe(303);
  await page.goto(new URL(created.headers().location).pathname);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/spreadsheets/*", route => route.fulfill({
    status: 409, json: { spreadsheetConflict: true },
  }));
  await page.getByRole("textbox", { name: "Cell A1", exact: true }).fill("=SUM(B1:B3)");
  await page.getByRole("button", { name: "Review recovery options" }).click();
  const recovery = page.getByRole("dialog", { name: "Keep your unsaved work" });
  await expect(recovery.getByRole("button", { name: "Reload latest version" })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Cell A1", exact: true })).toHaveAttribute("readonly", "");
  const downloadPromise = page.waitForEvent("download");
  await recovery.getByRole("button", { name: "Download my text" }).click();
  const stream = await (await downloadPromise).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString("utf8")).toContain("=SUM(B1:B3)");
  const bounds = await recovery.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(recovery).not.toBeVisible();
  await page.getByRole("button", { name: "Review recovery options" }).click();
  await recovery.getByRole("checkbox").check();
  await recovery.getByRole("button", { name: "Reload latest version" }).click();
  await expect(page.getByRole("textbox", { name: "Cell A1", exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Review recovery options" })).toHaveCount(0);
});
