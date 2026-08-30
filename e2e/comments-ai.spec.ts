import { expect, test } from "@playwright/test";

import { openSeedDocument } from "./helpers";

test.describe("comments and AI actioning", () => {
  test("queue a selection comment and action it with Thido", async ({
    page,
  }) => {
    await openSeedDocument(page);

    // Select a passage and open the comment composer from the bubble menu.
    await page.locator(".ProseMirror p").last().selectText();
    await page.getByTestId("bubble-add-comment").click();

    const composer = page.getByRole("textbox", {
      name: "Comment about the selected text",
    });
    await composer.fill("Make the ask concrete and specific.");
    await page
      .getByRole("button", { name: "Add comment", exact: true })
      .last()
      .click();

    // The comment is now queued for a batch action.
    const actionButton = page.getByRole("button", {
      name: /Action 1 comment with Thido/,
    });
    await expect(actionButton).toBeVisible({ timeout: 15_000 });

    await actionButton.click();

    // Locked state while Thido works.
    await expect(page.getByText("Thido is actioning comments…")).toBeVisible({
      timeout: 15_000,
    });

    // The mocked AI returns a revision, surfaced as a recent-change notice.
    await expect(
      page.getByRole("region", { name: "Recent edit by Thido" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".ProseMirror")).toContainText(
      "three warm intros",
    );
  });
});
