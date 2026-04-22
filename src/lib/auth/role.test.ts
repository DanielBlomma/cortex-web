import { describe, expect, it } from "vitest";
import { normalizeDashboardRole } from "./role";

describe("normalizeDashboardRole", () => {
  it("maps admin-like roles to admin", () => {
    expect(normalizeDashboardRole("org:admin")).toBe("admin");
    expect(normalizeDashboardRole("owner")).toBe("admin");
  });

  it("maps readonly-like roles to readonly", () => {
    expect(normalizeDashboardRole("viewer")).toBe("readonly");
    expect(normalizeDashboardRole("readonly")).toBe("readonly");
  });

  it("defaults unknown and missing roles to developer", () => {
    expect(normalizeDashboardRole("org:member")).toBe("developer");
    expect(normalizeDashboardRole(null)).toBe("developer");
  });
});
