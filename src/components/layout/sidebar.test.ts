import { describe, expect, it } from "vitest";
import { getVisibleNavigationGroups } from "./sidebar";

function visibleHrefs(permissions: string[]): string[] {
  return getVisibleNavigationGroups(permissions).flatMap((group) =>
    group.items.map((item) => item.href),
  );
}

describe("sidebar permissions", () => {
  it("shows only overview and user administration to an admin", () => {
    expect(visibleHrefs(["users:read"])).toEqual(["/", "/users"]);
  });

  it("does not expose users, reports, or inventory receipts to a manager", () => {
    const hrefs = visibleHrefs([
      "leads:read",
      "deals:read",
      "clients:read",
      "tasks:read",
      "panel_catalog:read",
      "products:read",
      "orders:read",
    ]);

    expect(hrefs).toContain("/products");
    expect(hrefs).not.toContain("/users");
    expect(hrefs).not.toContain("/reports");
    expect(hrefs).not.toContain("/receipts");
  });

  it("shows reports and receipts only with their explicit permissions", () => {
    expect(visibleHrefs(["reports:read", "inventory:read"])).toEqual([
      "/",
      "/receipts",
      "/reports",
    ]);
  });
});
