import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { DATABASE_URL, SEED } from "./constants";

const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });
const documentId = "e2e-history-pagination";
const path = `/api/documents/${documentId}/revisions`;

test.beforeAll(async () => {
  if (new URL(DATABASE_URL).hostname !== "127.0.0.1") throw new Error("History fixtures require the isolated local database.");
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: SEED.userEmail } });
  await prisma.document.create({ data: {
    id: documentId, ownerId: owner.id, title: "History test", titleManuallySet: true, status: "READY", revision: 125,
    content: { type: "doc", content: [{ type: "documentPreferences", attrs: { sideMargin: "standard" } }, { type: "paragraph", content: [{ type: "text", text: "Current document" }] }] },
    revisions: { create: Array.from({ length: 125 }, (_, index) => ({
      revision: index + 1, title: `Draft ${index + 1}`, source: "IMPORT", actorId: owner.id,
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `Snapshot ${index + 1}` }] }] },
    })) },
  } });
});

test.afterAll(async () => {
  await prisma.document.deleteMany({ where: { id: documentId } });
  await prisma.$disconnect();
});

test("loads ten metadata rows and only the selected preview, then shows more on request", async ({ page }) => {
  const previewRequests: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === path && url.searchParams.has("revision")) previewRequests.push(url.searchParams.get("revision")!);
  });
  await page.goto(`/documents/${documentId}/edit`);
  await expect(page.locator(".ProseMirror")).toBeVisible();
  await page.getByRole("menuitem", { name: "File", exact: true }).click();
  await page.getByRole("menuitem", { name: "Version history", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Version history" });
  await expect(dialog.getByRole("button", { name: /^Preview version/ })).toHaveCount(10);
  await expect(dialog).toContainText("Snapshot 125");
  expect(previewRequests).toEqual(["125"]);
  const response = await page.request.get(path);
  const body = await response.json();
  expect(body.revisions).toHaveLength(10);
  expect(body.revisions.every((row: object) => !("content" in row))).toBe(true);
  expect(body.nextCursor).toBe(116);
  await dialog.getByRole("button", { name: "Show more", exact: true }).click();
  await expect(dialog.getByRole("button", { name: /^Preview version/ })).toHaveCount(20);
  expect(previewRequests).toEqual(["125"]);
  let failPreview = true;
  await page.route(`**${path}?revision=110`, async route => {
    if (failPreview) {
      failPreview = false;
      return route.fulfill({ status: 503, json: { error: "Preview temporarily unavailable." } });
    }
    return route.continue();
  });
  await dialog.getByRole("button", { name: "Preview version 110", exact: true }).click();
  await expect(dialog).toContainText("Preview temporarily unavailable.");
  await dialog.getByRole("button", { name: "Retry preview" }).click();
  await expect(dialog).toContainText("Snapshot 110");
  expect(previewRequests).toEqual(["125", "110", "110"]);
  await dialog.getByRole("button", { name: "Restore this version" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".ProseMirror")).toContainText("Snapshot 110");
  expect(await prisma.documentRevision.count({ where: { documentId } })).toBe(126);
});

test("cursor paging can reach versions beyond the previous 100-row cap", async ({ page }) => {
  const expectedCount = await prisma.documentRevision.count({ where: { documentId } });
  let cursor: number | null = null;
  const seen: number[] = [];
  do {
    const response = await page.request.get(`${path}${cursor === null ? "" : `?before=${cursor}`}`);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.revisions.length).toBeLessThanOrEqual(10);
    seen.push(...body.revisions.map((row: { revision: number }) => row.revision));
    cursor = body.nextCursor;
  } while (cursor !== null);
  expect(seen.length).toBe(expectedCount);
  expect(new Set(seen).size).toBe(expectedCount);
  expect(seen.at(-1)).toBe(1);
  expect((await page.request.get(`${path}?before=invalid`)).status()).toBe(400);
});

test("owner can keep all history; email-page GET does not change the preference", async ({ page, browser }) => {
  await page.goto(`/documents/${documentId}/history`);
  expect(await prisma.documentHistoryRetention.findUnique({ where: { documentId } })).toBeNull();
  await page.getByRole("button", { name: "Keep all versions", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Automatic history cleanup is off");
  const state = await prisma.documentHistoryRetention.findUniqueOrThrow({ where: { documentId } });
  expect(state.keepAll).toBe(true);
  expect(state.deleteAfter).toBeNull();
  const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const response = await anonymous.request.post(`http://127.0.0.1:3100${path}/retention`, { data: { keepAll: true } });
  expect(response.status()).toBe(401);
  const list = await anonymous.request.get(`http://127.0.0.1:3100${path}`);
  expect(list.status()).toBe(401);
  await anonymous.close();
  const stranger = await prisma.user.create({ data: { email: "history-other@thido.test" } });
  const otherDocument = await prisma.document.create({ data: { ownerId: stranger.id } });
  const forbidden = await page.request.post(`/api/documents/${otherDocument.id}/revisions/retention`, { data: { keepAll: true } });
  expect(forbidden.status()).toBe(404);
  const hiddenPreview = await page.request.get(`/api/documents/${otherDocument.id}/revisions?revision=1`);
  expect(hiddenPreview.status()).toBe(404);
  await prisma.user.delete({ where: { id: stranger.id } });
});
