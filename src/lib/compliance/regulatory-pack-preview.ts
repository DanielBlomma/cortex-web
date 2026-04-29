import { getPolicyComplianceMetadata } from "@/lib/policies/metadata";
import {
  PLANNED_EU_REGULATORY_PACKS,
  type ComplianceControlArea,
  type PlannedEuRegulatoryPack,
} from "./frameworks";

export type RegulatoryPackPolicy = {
  id: string;
  ruleId: string;
  title: string;
  enforce: boolean;
  status: string;
  severity: string;
};

export type RegulatoryPackPreview = {
  pack: PlannedEuRegulatoryPack;
  evidenceLevel: "preview";
  policyCount: number;
  enforcedPolicyCount: number;
  recentViolationCount: number;
  controlAreas: ComplianceControlArea[];
  policies: RegulatoryPackPolicy[];
};

type ActivePolicyInput = {
  id: string;
  title: string;
  ruleId: string;
  status: string;
  severity: string;
  enforce: boolean;
};

type ViolationCountInput = {
  ruleId: string | null;
  count: number;
};

export function buildRegulatoryPackPreview(params: {
  activePolicies: ActivePolicyInput[];
  violationsByRule: ViolationCountInput[];
}): RegulatoryPackPreview[] {
  const violationCountByRule = new Map<string, number>();
  for (const violation of params.violationsByRule) {
    if (!violation.ruleId) continue;
    const previous = violationCountByRule.get(violation.ruleId) ?? 0;
    violationCountByRule.set(
      violation.ruleId,
      previous + Number(violation.count),
    );
  }

  return PLANNED_EU_REGULATORY_PACKS.map((pack) => {
    const matchingPolicies: RegulatoryPackPolicy[] = [];
    const controlAreaSet = new Set<ComplianceControlArea>();
    let recentViolationCount = 0;

    for (const policy of params.activePolicies) {
      const metadata = getPolicyComplianceMetadata(policy.ruleId);
      if (!metadata.plannedRegulatoryPacks.includes(pack)) continue;

      matchingPolicies.push({
        id: policy.id,
        ruleId: policy.ruleId,
        title: policy.title,
        enforce: policy.enforce,
        status: policy.status,
        severity: policy.severity,
      });
      for (const area of metadata.controlAreas) {
        controlAreaSet.add(area);
      }
      recentViolationCount += violationCountByRule.get(policy.ruleId) ?? 0;
    }

    return {
      pack,
      evidenceLevel: "preview" as const,
      policyCount: matchingPolicies.length,
      enforcedPolicyCount: matchingPolicies.filter((p) => p.enforce).length,
      recentViolationCount,
      controlAreas: Array.from(controlAreaSet),
      policies: matchingPolicies,
    };
  });
}
