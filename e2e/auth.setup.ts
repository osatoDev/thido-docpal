import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { test as setup } from "@playwright/test";

import { signInAsSeedUser } from "./helpers";

const STORAGE_STATE = "e2e/.auth/user.json";

setup("authenticate the seed user", async ({ page }) => {
  await signInAsSeedUser(page, "/plan");
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });
});
