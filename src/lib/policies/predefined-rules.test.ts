import { describe, it, expect } from "vitest";
import {
  PREDEFINED_RULES,
  isPredefinedRule,
} from "./predefined-rules";
import {
  COMPLIANCE_CONTROL_AREAS,
  PLANNED_EU_REGULATORY_PACKS,
} from "@/lib/compliance/frameworks";

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

  it("all rules declare at least one control area", () => {
    for (const rule of PREDEFINED_RULES) {
      expect(rule.controlAreas.length).toBeGreaterThan(0);
      for (const area of rule.controlAreas) {
        expect(COMPLIANCE_CONTROL_AREAS).toContain(area);
      }
    }
  });

  it("planned regulatory packs stay within the approved EU pack list", () => {
    for (const rule of PREDEFINED_RULES) {
      for (const pack of rule.plannedRegulatoryPacks) {
        expect(PLANNED_EU_REGULATORY_PACKS).toContain(pack);
      }
    }
  });

  it("marks no-env-in-prompts as supporting GDPR and EU AI Act planning", () => {
    const rule = PREDEFINED_RULES.find((entry) => entry.id === "no-env-in-prompts");
    expect(rule).toBeDefined();
    expect(rule!.plannedRegulatoryPacks).toContain("GDPR");
    expect(rule!.plannedRegulatoryPacks).toContain("EU AI Act");
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
