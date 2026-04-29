export const BASELINE_COMPLIANCE_FRAMEWORKS = [
  "ISO 27001",
  "ISO 42001",
  "SOC 2 Type II",
] as const;

export const PLANNED_EU_REGULATORY_PACKS = [
  "GDPR",
  "EU AI Act",
  "NIS2",
] as const;

export const COMPLIANCE_CONTROL_AREAS = [
  "Policy Governance And Organizational Rules",
  "Access Control And Accountability",
  "Operational Logging And Monitoring",
  "Governed Workflow And Human Review",
  "Data Minimization And Transfer Boundary",
  "Secure Development And Secret Hygiene",
  "Incident Handling And Reporting",
] as const;

export type BaselineComplianceFramework =
  (typeof BASELINE_COMPLIANCE_FRAMEWORKS)[number];

export type PlannedEuRegulatoryPack =
  (typeof PLANNED_EU_REGULATORY_PACKS)[number];

export type ComplianceControlArea =
  (typeof COMPLIANCE_CONTROL_AREAS)[number];
