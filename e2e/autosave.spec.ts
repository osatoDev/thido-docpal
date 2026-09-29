import { expect, test } from "@playwright/test";

import { SEED } from "./constants";
import { openSeedDocument } from "./helpers";

const savePath = `/api/documents/${SEED.documentId}`;

for (const modifier of ["Meta", "Control"]) {
  test(`${modifier}+S immediately saves edits and does nothing when already saved`, async ({ page }) => {
    await openSeedDocument(page);
    let saves = 0;
    page.on("request", request => {
      if (new URL(request.url()).pathname === savePath && request.method() === "PATCH") saves += 1;
    });
    await page.evaluate(() => {
      document.addEventListener("keydown", event => {
        if (event.key.toLowerCase() === "s" && (event.metaKey || event.ctrlKey)) {
          document.body.dataset.savePrevented = String(event.defaultPrevented);
        }
      });
    });
    const status = page.getByTestId("autosave-status");
    await page.keyboard.press(`${modifier}+s`);
    await expect(page.locator("body")).toHaveAttribute("data-save-prevented", "true");
    await expect(status).toHaveText("All changes save automatically");
    expect(saves).toBe(0);
    await page.locator(".ProseMirror p").first().click();
    await page.keyboard.type(` ${modifier} save shortcut.`);
    await expect(status).toContainText("Autosaving in");
    await page.keyboard.press(`${modifier}+s`);
    await expect(status.getByText("Saved", { exact: true })).toBeVisible();
    expect(saves).toBe(1);
    await page.keyboard.press(`${modifier}+s`);
    await expect(status).toHaveText("Saved");
    await page.reload();
    await expect(page.locator(".ProseMirror")).toContainText(`${modifier} save shortcut.`);
    expect(saves).toBe(1);
  });
}

test("opening and focusing a document stays idle until an actual edit", async ({ page }) => {
  let saves = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname === savePath && request.method() === "PATCH") saves += 1;
  });
  await openSeedDocument(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const status = page.getByTestId("autosave-status");
  await expect(status).toHaveText("All changes save automatically");
  await page.locator(".ProseMirror p").first().click();
  await page.keyboard.press("ArrowRight");
  await page.clock.fastForward(121_000);
  await expect(status).toHaveText("All changes save automatically");
  await expect(status.getByRole("button", { name: "Save now" })).toHaveCount(0);
  expect(saves).toBe(0);
  await page.keyboard.type(" Actual change.");
  await expect(status).toContainText("Autosaving in 120s");
  await status.getByRole("button", { name: "Save now" }).click();
  await expect(status.getByText("Saved", { exact: true })).toBeVisible();
  expect(saves).toBe(1);
});

test("waits 120 seconds after the last edit and shows acknowledged save status", async ({ page }) => {
  await openSeedDocument(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  let saves = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname === savePath && request.method() === "PATCH") saves += 1;
  });
  const status = page.getByTestId("autosave-status");
  await page.locator(".ProseMirror p").first().click();
  await page.keyboard.press("End");
  await page.keyboard.type(" Autosave countdown");
  await expect(status).toContainText("Autosaving in 120s");
  await expect(page.getByRole("progressbar", { name: "Time until autosave" })).toBeVisible();
  await page.clock.fastForward(60_000);
  expect(saves).toBe(0);
  await page.keyboard.type(" reset.");
  await expect(status).toContainText("Autosaving in 120s");
  await page.clock.fastForward(119_000);
  expect(saves).toBe(0);
  const response = page.waitForResponse(r => new URL(r.url()).pathname === savePath && r.request().method() === "PATCH");
  await page.clock.fastForward(1000);
  await expect(status.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
  expect(saves).toBe(1);
  expect(Object.keys((await (await response).json()).document).sort()).toEqual(["id", "revision", "title"]);
  await page.clock.resume();
  await page.reload();
  await expect(page.locator(".ProseMirror")).toContainText("Autosave countdown reset.");
});

test("an older response cannot mark newer edits saved", async ({ page }) => {
  await openSeedDocument(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let saves = 0;
  await page.route(`**${savePath}`, async route => {
    if (route.request().method() !== "PATCH") return route.continue();
    saves += 1;
    if (saves === 1) await held;
    await route.continue();
  });
  const status = page.getByTestId("autosave-status");
  await page.locator(".ProseMirror p").first().click();
  await page.keyboard.press("End");
  await page.keyboard.type(" First pending edit.");
  await status.getByRole("button", { name: "Save now" }).click();
  await expect(status).toContainText("Saving…");
  await expect(page.getByRole("progressbar", { name: "Saving document" })).toBeVisible();
  await page.locator(".ProseMirror p").first().click();
  await page.keyboard.press("End");
  await page.keyboard.type(" Newer pending edit.");
  const firstResponse = page.waitForResponse(r => new URL(r.url()).pathname === savePath && r.request().method() === "PATCH");
  release();
  await firstResponse;
  await expect(status).toContainText("Autosaving in");
  await expect(status.getByText("Saved", { exact: true })).toHaveCount(0);
  await status.getByRole("button", { name: "Save now" }).click();
  await expect(status.getByText("Saved", { exact: true })).toBeVisible();
  expect(saves).toBe(2);
  await page.reload();
  await expect(page.locator(".ProseMirror")).toContainText("Newer pending edit.");
});

test("failed saves stay unsaved, guard navigation, and can be retried", async ({ page }) => {
  await openSeedDocument(page);
  let fail = true;
  await page.route(`**${savePath}`, async route => {
    if (route.request().method() === "PATCH" && fail) {
      fail = false;
      return route.fulfill({ status: 503, json: { error: "Temporary failure" } });
    }
    await route.continue();
  });
  const status = page.getByTestId("autosave-status");
  const title = `Retry autosave ${Date.now()}`;
  await page.getByRole("textbox", { name: "Document title" }).fill(title);
  await status.getByRole("button", { name: "Save now" }).click();
  await expect(status).toContainText("Changes not saved");
  const dialog = page.waitForEvent("dialog");
  const navigation = page.locator('header a[href="/dashboard"]').first().click();
  await (await dialog).dismiss();
  await navigation;
  await expect(status).toContainText("Changes not saved");
  const unloading = page.waitForEvent("dialog");
  await page.evaluate(() => { window.setTimeout(() => window.location.reload(), 0); });
  const warning = await unloading;
  expect(warning.type()).toBe("beforeunload");
  await warning.dismiss();
  await expect(status).toContainText("Changes not saved");
  await status.getByRole("button", { name: "Retry save" }).click();
  await expect(status.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Document title" })).toHaveValue(title);
  await page.getByRole("textbox", { name: "Document title" }).fill(SEED.documentTitle);
  await status.getByRole("button", { name: "Save now" }).click();
  await expect(status.getByText("Saved", { exact: true })).toBeVisible();
});

test("stale saves require conflict resolution instead of claiming success", async ({ page }) => {
  await openSeedDocument(page);
  await page.route(`**${savePath}`, async route => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({ status: 409, json: { documentConflict: true, error: "Changed in another tab." } });
    }
    await route.continue();
  });
  const status = page.getByTestId("autosave-status");
  await page.getByRole("textbox", { name: "Document title" }).fill("Conflicting edit");
  await status.getByRole("button", { name: "Save now" }).click();
  await expect(status).toContainText("Unsaved changes · resolve conflict");
  await expect(status.getByRole("button", { name: "Retry save" })).toHaveCount(0);
  await page.getByRole("button", { name: "Reload latest version" }).click();
  await expect(status.getByText("Saved", { exact: true })).toBeVisible();
});

test("settings persist a custom autosave countdown", async ({ page }) => {
  try {
    await page.goto("/settings");
    const delay = page.getByRole("combobox", { name: "Document autosave delay" });
    await delay.selectOption("5");
    await expect(page.getByRole("status")).toContainText("Settings saved");
    await page.reload();
    await expect(delay).toHaveValue("5");
    await openSeedDocument(page);
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.getByRole("textbox", { name: "Document title" }).fill("Custom autosave delay");
    const status = page.getByTestId("autosave-status");
    await expect(status).toContainText("Autosaving in 5s");
    await page.clock.fastForward(4000);
    await expect(status).toContainText("Autosaving in 1s");
    await page.clock.fastForward(1000);
    await expect(status.getByText("Saved", { exact: true })).toBeVisible();
    await page.clock.resume();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Document title" })).toHaveValue("Custom autosave delay");
  } finally {
    await page.request.patch("/api/settings", { data: { autosaveDelaySeconds: 120 } });
  }
});
