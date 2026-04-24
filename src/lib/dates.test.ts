import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./dates";

describe("dates", () => {
  it("formats Swedish dates as YYYY-MM-DD", () => {
    expect(formatDate("2026-04-23T10:15:00Z", "sv-SE")).toBe("2026-04-23");
  });

  it("formats US dates as MM/DD/YYYY", () => {
    expect(formatDate("2026-04-23T10:15:00Z", "en-US")).toBe("04/23/2026");
  });

  it("formats locale-specific date time strings", () => {
    expect(formatDateTime("2026-04-23T10:15:00Z", "sv-SE")).toContain("2026-04-23");
    expect(formatDateTime("2026-04-23T10:15:00Z", "en-US")).toContain("04/23/2026");
  });

  it("canonicalizes underscore locales before formatting", () => {
    expect(formatDate("2026-04-23T10:15:00Z", "en_US")).toBe("04/23/2026");
  });

  it("falls back to English for invalid locales", () => {
    expect(() => formatDate("2026-04-23T10:15:00Z", "*")).not.toThrow();
    expect(() => formatDateTime("2026-04-23T10:15:00Z", "*")).not.toThrow();
    expect(formatDate("2026-04-23T10:15:00Z", "*")).toBe("04/23/2026");
  });
});
