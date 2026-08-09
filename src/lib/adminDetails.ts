export const adminDetailViews = [
  "users",
  "beta-users",
  "documents",
  "comments",
  "pending-suggestions",
  "waitlist",
] as const;

export type AdminDetailView = (typeof adminDetailViews)[number];

export function parseAdminDetailView(value: string): AdminDetailView | null {
  return adminDetailViews.includes(value as AdminDetailView)
    ? (value as AdminDetailView)
    : null;
}

export function parseAdminDetailPage(
  value: string | string[] | undefined,
): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !/^\d+$/.test(candidate)) return 1;

  const page = Number(candidate);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10_000) : 1;
}

export function adminDetailHref(view: AdminDetailView) {
  return `/admin/details/${view}`;
}
