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

  it("accepts richer lifecycle counters and tool metrics", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      total_tool_calls: 20,
      successful_tool_calls: 18,
      failed_tool_calls: 2,
      total_duration_ms: 1500,
      session_starts: 1,
      session_ends: 1,
      session_duration_ms_total: 60000,
      session_id: "session_12345678",
      tool_metrics: {
        "context.search": {
          calls: 10,
          failures: 1,
          total_duration_ms: 800,
          total_results_returned: 42,
          estimated_tokens_saved: 5000,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid session_id format", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      session_id: "bad id",
    });
    expect(result.success).toBe(false);
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

  it("rejects unknown telemetry fields", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      prompt: "show me the code",
    });
    expect(result.success).toBe(false);
  });

  // v2.0.0 compatibility: cortex-mcp's TelemetryCollector emits these
  // exact field formats. Schema must accept them or every cortex client
  // silently fails (this was the original v2.0.0 motivator).
  it("v2: accepts randomUUID() session_id (enterprise/index.ts)", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      session_id: "12345678-9abc-def0-1234-56789abcdef0",
    });
    expect(result.success).toBe(true);
  });

  it("v2: accepts 16-char hex instance_id (generateInstanceId() in collector.ts)", () => {
    const result = telemetryPushSchema.safeParse({
      ...validPayload,
      instance_id: "a1b2c3d4e5f60718",
    });
    expect(result.success).toBe(true);
  });
});
