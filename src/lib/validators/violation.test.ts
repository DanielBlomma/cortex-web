import { describe, it, expect } from "vitest";
import { violationPushSchema } from "./violation";

const validPayload = {
  violations: [
    {
      rule_id: "no-secrets-in-code",
      severity: "error" as const,
      message: "Hardcoded API key detected",
      file_path: "src/config.ts",
      occurred_at: "2025-01-01T12:00:00Z",
    },
  ],
};

describe("violationPushSchema", () => {
  it("accepts a valid payload", () => {
    const result = violationPushSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts optional repo field", () => {
    const result = violationPushSchema.safeParse({
      repo: "my-app",
      ...validPayload,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.repo).toBe("my-app");
    }
  });

  it("accepts multiple violations", () => {
    const result = violationPushSchema.safeParse({
      violations: [
        { rule_id: "rule-a", occurred_at: "2025-01-01T00:00:00Z" },
        { rule_id: "rule-b", occurred_at: "2025-01-01T00:00:00Z" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty violations array", () => {
    const result = violationPushSchema.safeParse({ violations: [] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 100 violations", () => {
    const violations = Array.from({ length: 101 }, (_, i) => ({
      rule_id: `rule-${i}`,
      occurred_at: "2025-01-01T00:00:00Z",
    }));
    const result = violationPushSchema.safeParse({ violations });
    expect(result.success).toBe(false);
  });

  it("rejects invalid rule_id format", () => {
    const result = violationPushSchema.safeParse({
      violations: [
        { rule_id: "UPPERCASE", occurred_at: "2025-01-01T00:00:00Z" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid severity", () => {
    const result = violationPushSchema.safeParse({
      violations: [
        {
          rule_id: "test-rule",
          severity: "critical",
          occurred_at: "2025-01-01T00:00:00Z",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("defaults severity to warning", () => {
    const result = violationPushSchema.safeParse({
      violations: [
        { rule_id: "test-rule", occurred_at: "2025-01-01T00:00:00Z" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.violations[0].severity).toBe("warning");
    }
  });

  it("rejects invalid datetime", () => {
    const result = violationPushSchema.safeParse({
      violations: [{ rule_id: "test-rule", occurred_at: "not-a-date" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects message over 2000 chars", () => {
    const result = violationPushSchema.safeParse({
      violations: [
        {
          rule_id: "test-rule",
          message: "x".repeat(2001),
          occurred_at: "2025-01-01T00:00:00Z",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects repo over 200 chars", () => {
    const result = violationPushSchema.safeParse({
      repo: "x".repeat(201),
      ...validPayload,
    });
    expect(result.success).toBe(false);
  });
});
