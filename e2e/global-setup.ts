import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import {
  DATABASE_URL,
  PG_CONTAINER,
  PG_PORT,
  USES_MANAGED_DB,
} from "./constants";
import { seed } from "./seed";

const FORBIDDEN_DB_HOSTS = /neon\.tech|rds\.amazonaws\.com|supabase\.co/i;
const PGDATA = resolve(process.cwd(), "e2e/.pgdata");

function run(command: string, extraEnv: Record<string, string> = {}) {
  execSync(command, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
}

function quiet(bin: string, args: string[]) {
  execFileSync(bin, args, { stdio: "ignore" });
}

function dockerRunning() {
  try {
    quiet("docker", ["info"]);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(check: () => void, what: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      check();
      return;
    } catch {
      await sleep(1000);
    }
  }
  throw new Error(`${what} did not become ready in time.`);
}

async function startDockerPostgres() {
  try {
    quiet("docker", ["rm", "-f", PG_CONTAINER]);
  } catch {
    /* nothing to remove */
  }
  run(
    `docker run -d --rm --name ${PG_CONTAINER} ` +
      `-e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=thido_e2e ` +
      `-p ${PG_PORT}:5432 postgres:16-alpine`,
  );
  await waitFor(
    () =>
      quiet("docker", [
        "exec",
        PG_CONTAINER,
        "pg_isready",
        "-U",
        "postgres",
        "-d",
        "thido_e2e",
      ]),
    "e2e Postgres container",
  );
}

async function startLocalPostgres() {
  if (!existsSync(`${PGDATA}/PG_VERSION`)) {
    run(
      `initdb -D "${PGDATA}" -U postgres --auth=trust --encoding=UTF8 --no-sync`,
    );
  }
  try {
    quiet("pg_ctl", ["-D", PGDATA, "status"]);
  } catch {
    run(
      `pg_ctl -D "${PGDATA}" -w -l "${PGDATA}/server.log" ` +
        `-o "-p ${PG_PORT} -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" start`,
    );
  }
  await waitFor(
    () => quiet("pg_isready", ["-h", "127.0.0.1", "-p", String(PG_PORT)]),
    "local e2e Postgres",
  );
  try {
    execFileSync(
      "createdb",
      ["-h", "127.0.0.1", "-p", String(PG_PORT), "-U", "postgres", "thido_e2e"],
      { stdio: "ignore" },
    );
  } catch {
    // Database already exists from a previous run; seed() truncates it anyway.
  }
}

export default async function globalSetup() {
  if (FORBIDDEN_DB_HOSTS.test(DATABASE_URL)) {
    throw new Error(
      `Refusing to run e2e tests against "${DATABASE_URL}". This looks like a ` +
        "hosted/production database. Use the default local database or point " +
        "E2E_DATABASE_URL at a throwaway Postgres.",
    );
  }

  if (!USES_MANAGED_DB) {
    if (dockerRunning()) {
      await startDockerPostgres();
    } else {
      await startLocalPostgres();
    }
  }

  run("npx prisma migrate deploy", {
    DATABASE_URL,
    DATABASE_URL_UNPOOLED: DATABASE_URL,
  });

  await seed();
}
