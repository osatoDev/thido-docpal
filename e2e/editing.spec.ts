import { expect, test } from "@playwright/test";

import { SEED } from "./constants";
import { openSeedDocument } from "./helpers";

test.describe("document editing", () => {
  test("typing autosaves and survives a reload", async ({ page }) => {
    await openSeedDocument(page);

    const editor = page.locator(".ProseMirror");
    const marker = ` Checked by e2e ${Date.now()}.`;

    await editor.locator("p").first().click();
    await page.keyboard.press("End");
    await page.keyboard.type(marker);

    await expect(page.getByText("Saved", { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await page.reload();
    await expect(page.locator(".ProseMirror")).toContainText(marker.trim());
  });

  test("File menu Download opens a side flyout", async ({ page }) => {
    await openSeedDocument(page);

    await page.getByRole("menuitem", { name: "File" }).click();
    const fileMenu = page.getByRole("menu", { name: "File" });
    await expect(fileMenu).toBeVisible();

    await fileMenu.getByRole("menuitem", { name: "Download" }).click();
    const downloadMenu = page.getByRole("menu", { name: "Download" });
    await expect(downloadMenu).toBeVisible();
    await expect(
      downloadMenu.getByRole("menuitem", { name: "PDF document (.pdf)" }),
    ).toBeVisible();

    // The flyout is portalled to <body>, positioned beside (not inside) the
    // File menu panel.
    const flyoutBox = await downloadMenu.boundingBox();
    const fileBox = await fileMenu.boundingBox();
    expect(flyoutBox && fileBox).toBeTruthy();
    expect(flyoutBox!.x).toBeGreaterThan(fileBox!.x + fileBox!.width - 4);
  });

  test("bold and heading formatting apply to the selection", async ({ page }) => {
    await openSeedDocument(page);

    const firstParagraph = page.locator(".ProseMirror p").first();
    await firstParagraph.selectText();
    await page.getByRole("button", { name: "Bold", exact: true }).click();

    await expect(firstParagraph.locator("strong")).toHaveCount(1);
  });

  test("View menu side margins change and persist", async ({ page }) => {
    await openSeedDocument(page);
    const editor = page.locator(".ProseMirror");

    const paddingLeft = () =>
      editor.evaluate((node) => parseFloat(getComputedStyle(node).paddingLeft));

    await expect(editor).toHaveAttribute(
      "data-document-side-margin",
      "standard",
    );
    const standardPadding = await paddingLeft();

    await page.getByRole("menuitem", { name: "View" }).click();
    await page.getByRole("menuitem", { name: "Side margins" }).click();
    await page.getByRole("menuitem", { name: /Wide/ }).click();

    await expect(editor).toHaveAttribute("data-document-side-margin", "wide");
    // `padding-inline` has a CSS transition; wait for it to settle.
    await expect
      .poll(paddingLeft, { timeout: 5_000 })
      .toBeGreaterThan(standardPadding + 10);

    // The choice autosaves into the document's preferences node.
    const savedSideMargin = () =>
      page.evaluate(async (id) => {
        const res = await fetch(`/api/documents/${id}`);
        const body = await res.json();
        return body.document?.content?.content?.find(
          (node: { type?: string }) => node.type === "documentPreferences",
        )?.attrs?.sideMargin;
      }, SEED.documentId);
    await expect.poll(savedSideMargin, { timeout: 15_000 }).toBe("wide");

    await page.reload();
    await expect
      .poll(
        () =>
          page
            .locator(".ProseMirror")
            .getAttribute("data-document-side-margin"),
        { timeout: 10_000 },
      )
      .toBe("wide");
  });
});
