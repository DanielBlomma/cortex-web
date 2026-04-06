import { describe, it, expect } from "vitest";
import {
  PREDEFINED_RULES,
  isPredefinedRule,
} from "./predefined-rules";

describe("PREDEFINED_RULES", () => {
  it("contains the prompt-injection-defense rule", () => {
    const rule = PREDEFINED_RULES.find(
      (r) => r.id === "prompt-injection-defense"
    );
    expect(rule).toBeDefined();
    expect(rule!.category).toBe("security");
    expect(rule!.defaultPriority).toBe(95);
  });

  it("has unique rule IDs", () => {
    const ids = PREDEFINED_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all rules have valid priorities (1-100)", () => {
    for (const rule of PREDEFINED_RULES) {
      expect(rule.defaultPriority).toBeGreaterThanOrEqual(1);
      expect(rule.defaultPriority).toBeLessThanOrEqual(100);
    }
  });

  it("all rule IDs match kebab-case pattern", () => {
    for (const rule of PREDEFINED_RULES) {
      expect(rule.id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });
});

describe("isPredefinedRule", () => {
  it("returns true for prompt-injection-defense", () => {
    expect(isPredefinedRule("prompt-injection-defense")).toBe(true);
  });

  it("returns true for all predefined rule IDs", () => {
    for (const rule of PREDEFINED_RULES) {
      expect(isPredefinedRule(rule.id)).toBe(true);
    }
  });

  it("returns false for unknown rule IDs", () => {
    expect(isPredefinedRule("nonexistent-rule")).toBe(false);
    expect(isPredefinedRule("")).toBe(false);
  });
});
