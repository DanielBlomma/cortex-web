import { describe, it, expect } from "vitest";
import { telemetryPushSchema } from "./telemetry";

const validPayload = {
  period_start: "2025-01-01T00:00:00Z",
  period_end: "2025-01-01T01:00:00Z",
  searches: 10,
  related_lookups: 5,
  rule_lookups: 3,
  reloads: 1,
  total_results_returned: 42,
  estimated_tokens_saved: 5000,
};

describe("telemetryPushSchema", () => {
  it("accepts a valid payload", () => {
    const result = telemetryPushSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts optional client_version", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      client_version: "1.2.3",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional estimated_tokens_total", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      estimated_tokens_total: 10000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects when period_end is before period_start", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      period_start: "2025-01-02T00:00:00Z",
      period_end: "2025-01-01T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative numbers", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      searches: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects numbers exceeding max", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      searches: 2_000_000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = telemetryPushSchema.safeParse({
      period_start: "2025-01-01T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid datetime format", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      period_start: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejects client_version over 50 chars", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      client_version: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});
