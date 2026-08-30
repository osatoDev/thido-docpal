import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { PG_CONTAINER, USES_MANAGED_DB } from "./constants";

const PGDATA = resolve(process.cwd(), "e2e/.pgdata");

function quiet(bin: string, args: string[]) {
  try {
    execFileSync(bin, args, { stdio: "ignore" });
  } catch {
    /* already gone */
  }
}

export default async function globalTeardown() {
  if (USES_MANAGED_DB) return;
  if (process.env.E2E_KEEP_DB === "1") return;

  quiet("docker", ["rm", "-f", PG_CONTAINER]);
  if (existsSync(`${PGDATA}/PG_VERSION`)) {
    quiet("pg_ctl", ["-D", PGDATA, "-m", "fast", "-w", "stop"]);
  }
}
