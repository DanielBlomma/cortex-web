import type {
  ComplianceControlArea,
  PlannedEuRegulatoryPack,
} from "@/lib/compliance/frameworks";

export type Policy = {
  id: string;
  title: string;
  ruleId: string;
  kind: "predefined" | "custom";
  status: "draft" | "active" | "disabled" | "archived";
  severity: "info" | "warning" | "error" | "block";
  description: string;
  priority: number;
  scope: string;
  enforce: boolean;
  type: string | null;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
  reviewFailureCount?: number;
  warningReviewCount?: number;
  violationCount?: number;
  lastTriggeredAt?: string | null;
  recentlyTriggered?: boolean;
  controlAreas?: ComplianceControlArea[];
  plannedRegulatoryPacks?: PlannedEuRegulatoryPack[];
};
