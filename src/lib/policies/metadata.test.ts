import { describe, expect, it } from "vitest";
import {
  getPolicyComplianceMetadata,
  hydratePolicyComplianceMetadata,
} from "./metadata";

describe("getPolicyComplianceMetadata", () => {
  it("returns predefined rule metadata when the rule is known", () => {
    const metadata = getPolicyComplianceMetadata("no-env-in-prompts");

    expect(metadata.controlAreas).toContain("Data Minimization And Transfer Boundary");
    expect(metadata.plannedRegulatoryPacks).toContain("GDPR");
    expect(metadata.plannedRegulatoryPacks).toContain("EU AI Act");
  });

  it("returns empty metadata for unknown rules", () => {
    expect(getPolicyComplianceMetadata("custom:unknown-rule")).toEqual({
      controlAreas: [],
      plannedRegulatoryPacks: [],
    });
  });
});

describe("hydratePolicyComplianceMetadata", () => {
  it("adds derived compliance metadata to a policy-shaped object", () => {
    const hydrated = hydratePolicyComplianceMetadata({
      id: "policy-1",
      ruleId: "prompt-injection-defense",
      title: "Prompt Injection Defense",
    });

    expect(hydrated.controlAreas).toContain("Operational Logging And Monitoring");
    expect(hydrated.plannedRegulatoryPacks).toContain("EU AI Act");
    expect(hydrated.title).toBe("Prompt Injection Defense");
  });
});
