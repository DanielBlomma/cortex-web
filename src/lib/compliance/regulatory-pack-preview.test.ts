import { describe, expect, it } from "vitest";
import { buildRegulatoryPackPreview } from "./regulatory-pack-preview";
import { PLANNED_EU_REGULATORY_PACKS } from "./frameworks";

const basePolicy = {
  status: "active",
  severity: "block",
  enforce: true,
};

describe("buildRegulatoryPackPreview", () => {
  it("returns one entry per planned pack with evidenceLevel preview", () => {
    const result = buildRegulatoryPackPreview({
      activePolicies: [],
      violationsByRule: [],
    });

    expect(result.map((p) => p.pack)).toEqual([...PLANNED_EU_REGULATORY_PACKS]);
    for (const entry of result) {
      expect(entry.evidenceLevel).toBe("preview");
      expect(entry.policyCount).toBe(0);
      expect(entry.enforcedPolicyCount).toBe(0);
      expect(entry.recentViolationCount).toBe(0);
      expect(entry.controlAreas).toEqual([]);
      expect(entry.policies).toEqual([]);
    }
  });

  it("groups policies under the packs declared by their predefined rule", () => {
    const result = buildRegulatoryPackPreview({
      activePolicies: [
        {
          ...basePolicy,
          id: "p1",
          title: "No Env In Prompts",
          ruleId: "no-env-in-prompts",
        },
        {
          ...basePolicy,
          id: "p2",
          title: "No Secrets In Code",
          ruleId: "no-secrets-in-code",
        },
      ],
      violationsByRule: [],
    });

    const gdpr = result.find((p) => p.pack === "GDPR");
    const aiAct = result.find((p) => p.pack === "EU AI Act");
    const nis2 = result.find((p) => p.pack === "NIS2");

    expect(gdpr?.policyCount).toBe(1);
    expect(gdpr?.policies.map((p) => p.ruleId)).toEqual(["no-env-in-prompts"]);
    expect(aiAct?.policyCount).toBe(1);
    expect(aiAct?.policies.map((p) => p.ruleId)).toEqual(["no-env-in-prompts"]);
    expect(nis2?.policyCount).toBe(1);
    expect(nis2?.policies.map((p) => p.ruleId)).toEqual(["no-secrets-in-code"]);
  });

  it("counts only enforced policies in enforcedPolicyCount", () => {
    const result = buildRegulatoryPackPreview({
      activePolicies: [
        {
          ...basePolicy,
          id: "p1",
          title: "Enforced",
          ruleId: "no-env-in-prompts",
          enforce: true,
        },
        {
          ...basePolicy,
          id: "p2",
          title: "Advisory",
          ruleId: "require-code-review",
          enforce: false,
        },
      ],
      violationsByRule: [],
    });

    const aiAct = result.find((p) => p.pack === "EU AI Act");
    expect(aiAct?.policyCount).toBe(2);
    expect(aiAct?.enforcedPolicyCount).toBe(1);
  });

  it("aggregates violation counts for rules that map to a pack", () => {
    const result = buildRegulatoryPackPreview({
      activePolicies: [
        {
          ...basePolicy,
          id: "p1",
          title: "No Env In Prompts",
          ruleId: "no-env-in-prompts",
        },
      ],
      violationsByRule: [
        { ruleId: "no-env-in-prompts", count: 7 },
        { ruleId: "unknown-rule", count: 99 },
        { ruleId: null, count: 50 },
      ],
    });

    const gdpr = result.find((p) => p.pack === "GDPR");
    expect(gdpr?.recentViolationCount).toBe(7);
  });

  it("ignores policies whose ruleId is not predefined", () => {
    const result = buildRegulatoryPackPreview({
      activePolicies: [
        {
          ...basePolicy,
          id: "custom1",
          title: "Custom",
          ruleId: "custom:my-thing",
        },
      ],
      violationsByRule: [],
    });

    for (const entry of result) {
      expect(entry.policyCount).toBe(0);
    }
  });

  it("dedupes control areas across multiple matching policies", () => {
    const result = buildRegulatoryPackPreview({
      activePolicies: [
        {
          ...basePolicy,
          id: "p1",
          title: "First",
          ruleId: "no-env-in-prompts",
        },
        {
          ...basePolicy,
          id: "p2",
          title: "Second",
          ruleId: "no-external-api-calls",
        },
      ],
      violationsByRule: [],
    });

    const gdpr = result.find((p) => p.pack === "GDPR");
    expect(gdpr?.policyCount).toBe(2);
    const areas = gdpr?.controlAreas ?? [];
    expect(areas).toContain("Data Minimization And Transfer Boundary");
    expect(new Set(areas).size).toBe(areas.length);
  });
});
