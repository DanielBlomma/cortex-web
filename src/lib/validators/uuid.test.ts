import { describe, it, expect } from "vitest";
import { UUID_RE } from "./uuid";

describe("UUID_RE", () => {
  it("matches a valid UUID v4", () => {
    expect(UUID_RE.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("matches lowercase UUIDs", () => {
    expect(UUID_RE.test("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(UUID_RE.test("")).toBe(false);
  });

  it("rejects non-UUID strings", () => {
    expect(UUID_RE.test("not-a-uuid")).toBe(false);
  });

  it("rejects UUID without hyphens", () => {
    expect(UUID_RE.test("550e8400e29b41d4a716446655440000")).toBe(false);
  });

  it("rejects UUID with extra characters", () => {
    expect(UUID_RE.test("550e8400-e29b-41d4-a716-446655440000-extra")).toBe(false);
  });

  it("rejects SQL injection attempt", () => {
    expect(UUID_RE.test("'; DROP TABLE users; --")).toBe(false);
  });
});
