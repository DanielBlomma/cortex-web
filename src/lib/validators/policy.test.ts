import { describe, it, expect } from "vitest";
import { createPolicySchema, updatePolicySchema } from "./policy";

const baseValid = {
  title: "My Policy",
  ruleId: "custom:my-rule",
  description: "Test rule",
  status: "active",
  severity: "block",
  priority: 50,
  scope: "global",
  enforce: true,
};

describe("createPolicySchema", () => {
  it("accepts a policy without type/config (backcompat for predefined rules)", () => {
    const result = createPolicySchema.safeParse(baseValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("My Policy");
      expect(result.data.type).toBeUndefined();
      expect(result.data.config).toBeUndefined();
    }
  });

  it("accepts a custom policy with type + config", () => {
    const result = createPolicySchema.safeParse({
      ...baseValid,
      type: "regex",
      config: { pattern: "TODO:", paths: ["src/**/*.ts"], severity: "warning" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("regex");
      expect(result.data.config).toEqual({
        pattern: "TODO:",
        paths: ["src/**/*.ts"],
        severity: "warning",
      });
    }
  });

  it("accepts unknown type strings (forward-compat for new evaluators)", () => {
    const result = createPolicySchema.safeParse({
      ...baseValid,
      type: "future_evaluator_type",
      config: {},
    });
    expect(result.success).toBe(true);
  });

  it("accepts null type and null config explicitly", () => {
    const result = createPolicySchema.safeParse({
      ...baseValid,
      type: null,
      config: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty string as type", () => {
    const result = createPolicySchema.safeParse({
      ...baseValid,
      type: "",
      config: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-object config", () => {
    const result = createPolicySchema.safeParse({
      ...baseValid,
      type: "regex",
      config: "not-an-object",
    });
    expect(result.success).toBe(false);
  });

  it("accepts explicit status and severity", () => {
    const result = createPolicySchema.safeParse({
      ...baseValid,
      status: "draft",
      severity: "warning",
    });
    expect(result.success).toBe(true);
  });
});

describe("updatePolicySchema", () => {
  it("accepts a partial update with just type/config", () => {
    const result = updatePolicySchema.safeParse({
      type: "regex",
      config: { pattern: "FIXME" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts clearing type/config via null", () => {
    const result = updatePolicySchema.safeParse({
      type: null,
      config: null,
    });
    expect(result.success).toBe(true);
  });
});
