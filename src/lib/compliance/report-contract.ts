import {
  RESIDUAL_CUSTOMER_RESPONSIBILITIES,
  type ControlEntry,
} from "./control-mapping";
import { BASELINE_COMPLIANCE_FRAMEWORKS } from "./frameworks";
import type { RegulatoryPackPreview } from "./regulatory-pack-preview";

export type ComplianceControlMatrix = {
  summary: {
    covered: number;
    partial: number;
    manual: number;
    total: number;
  };
  controls: ControlEntry[];
};

export function buildComplianceReportContract(params: {
  generatedAt: string;
  periodFrom: string;
  periodTo: string;
  orgId: string;
  controlMapping: ComplianceControlMatrix;
  regulatoryPackPreview: RegulatoryPackPreview[];
}) {
  return {
    meta: {
      generatedAt: params.generatedAt,
      periodFrom: params.periodFrom,
      periodTo: params.periodTo,
      orgId: params.orgId,
      framework: [...BASELINE_COMPLIANCE_FRAMEWORKS],
    },
    controlMapping: params.controlMapping,
    regulatoryPackPreview: params.regulatoryPackPreview,
    residualResponsibilities: [...RESIDUAL_CUSTOMER_RESPONSIBILITIES],
  };
}
