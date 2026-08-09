import { describe, expect, it } from "vitest";
import {
  adminDetailHref,
  parseAdminDetailPage,
  parseAdminDetailView,
} from "@/lib/adminDetails";

describe("admin detail routes", () => {
  it("accepts known detail views", () => {
    expect(parseAdminDetailView("users")).toBe("users");
    expect(parseAdminDetailView("pending-suggestions")).toBe(
      "pending-suggestions",
    );
  });

  it("rejects unknown detail views", () => {
    expect(parseAdminDetailView("billing-secrets")).toBeNull();
  });

  it("uses only positive integer page numbers", () => {
    expect(parseAdminDetailPage("3")).toBe(3);
    expect(parseAdminDetailPage(["4", "5"])).toBe(4);
    expect(parseAdminDetailPage("0")).toBe(1);
    expect(parseAdminDetailPage("2.5")).toBe(1);
    expect(parseAdminDetailPage("999999999")).toBe(10_000);
    expect(parseAdminDetailPage(undefined)).toBe(1);
  });

  it("builds an admin detail URL", () => {
    expect(adminDetailHref("documents")).toBe("/admin/details/documents");
  });
});
