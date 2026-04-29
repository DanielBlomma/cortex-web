import type {
  ComplianceControlArea,
  PlannedEuRegulatoryPack,
} from "@/lib/compliance/frameworks";
import { PREDEFINED_RULES } from "./predefined-rules";

export type PolicyComplianceMetadata = {
  controlAreas: ComplianceControlArea[];
  plannedRegulatoryPacks: PlannedEuRegulatoryPack[];
};

export function getPolicyComplianceMetadata(ruleId: string): PolicyComplianceMetadata {
  const predefined = PREDEFINED_RULES.find((rule) => rule.id === ruleId);
  if (!predefined) {
    return {
      controlAreas: [],
      plannedRegulatoryPacks: [],
    };
  }

  return {
    controlAreas: predefined.controlAreas,
    plannedRegulatoryPacks: predefined.plannedRegulatoryPacks,
  };
}

export function hydratePolicyComplianceMetadata<T extends { ruleId: string }>(
  policy: T
): T & PolicyComplianceMetadata {
  return {
    ...policy,
    ...getPolicyComplianceMetadata(policy.ruleId),
  };
}
