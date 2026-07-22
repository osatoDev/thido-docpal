import "server-only";

import { z } from "zod";

const API_BASE = "https://api.vercel.com/v1/query/web-analytics/visits/aggregate";

const analyticsResponseSchema = z.object({
  data: z.array(
    z
      .object({
        route: z.string().optional(),
        pageviews: z.number().nonnegative(),
        visitors: z.number().nonnegative(),
      })
      .passthrough(),
  ),
});

export type VercelAnalyticsSummary =
  | {
      status: "ready";
      pageviews: number;
      visitors: number;
      routes: Array<{ route: string; pageviews: number; visitors: number }>;
    }
  | { status: "unconfigured" }
  | { status: "error" };

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function queryVisits(
  by: "day" | "route",
  since: string,
  until: string,
  limit?: number,
) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) return null;

  const url = new URL(API_BASE);
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("since", since);
  url.searchParams.set("until", until);
  url.searchParams.set("by", by);

  if (process.env.VERCEL_TEAM_ID) {
    url.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
  }
  if (limit) url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Vercel Web Analytics returned ${response.status}`);
  }

  return analyticsResponseSchema.parse(await response.json()).data;
}

export async function getVercelAnalyticsSummary(): Promise<VercelAnalyticsSummary> {
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    return { status: "unconfigured" };
  }

  const until = new Date();
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - 6);

  try {
    const [days, routes] = await Promise.all([
      queryVisits("day", dateOnly(since), dateOnly(until)),
      queryVisits("route", dateOnly(since), dateOnly(until), 5),
    ]);

    if (!days || !routes) return { status: "unconfigured" };

    return {
      status: "ready",
      pageviews: days.reduce((sum, row) => sum + row.pageviews, 0),
      visitors: days.reduce((sum, row) => sum + row.visitors, 0),
      routes: routes.map((row) => ({
        route: row.route ?? "Other",
        pageviews: row.pageviews,
        visitors: row.visitors,
      })),
    };
  } catch (error) {
    console.error("[admin] Could not load Vercel Web Analytics", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error" };
  }
}
