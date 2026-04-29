import type { BaselineComplianceFramework } from "./frameworks";

export type ComplianceStatus = "covered" | "partial" | "manual";

export type ComplianceEvidence = {
  activePolicies: number;
  enforcedPolicies: number;
  activeKeys: number;
  revokedKeysInPeriod: number;
  telemetryPushes: number;
  totalToolCalls: number;
  auditEvents: number;
  requiredAuditEvents: number;
  clientAuditEvents: number;
  reviewTotal: number;
  reviewFailures: number;
  workflowSnapshots: number;
  approvedWorkflowSnapshots: number;
  boundaryDocumented: boolean;
};

export type FrameworkMapping = {
  framework: BaselineComplianceFramework;
  area: string;
};

export type ControlEntry = {
  id: string;
  title: string;
  capability: string;
  status: ComplianceStatus;
  rationale: string;
  evidenceSignals: string[];
  mappings: FrameworkMapping[];
  customerResponsibilities: string[];
};

type ControlDefinition = {
  id: string;
  title: string;
  capability: string;
  mappings: FrameworkMapping[];
  evaluate: (evidence: ComplianceEvidence) => {
    status: ComplianceStatus;
    rationale: string;
    evidenceSignals: string[];
  };
  customerResponsibilities: string[];
};

const CONTROL_DEFINITIONS: ControlDefinition[] = [
  {
    id: "GOV-001",
    title: "Policy Governance And Organizational Rules",
    capability:
      "Cortex policies define active organization rules, enforcement mode, scope, and severity.",
    mappings: [
      { framework: "ISO 27001", area: "A.5 Information security policies" },
      { framework: "ISO 42001", area: "Policy and AI governance direction" },
      { framework: "SOC 2 Type II", area: "CC1 Control environment" },
    ],
    evaluate: (evidence) => {
      if (evidence.activePolicies > 0 && evidence.enforcedPolicies > 0) {
        return {
          status: "covered",
          rationale:
            "Active and enforced policies exist in the control plane and are synchronized to enterprise clients.",
          evidenceSignals: [
            `${evidence.activePolicies} configured policies`,
            `${evidence.enforcedPolicies} enforced policies`,
          ],
        };
      }
      if (evidence.activePolicies > 0) {
        return {
          status: "partial",
          rationale:
            "Policies are present, but blocking enforcement is limited or not yet enabled for all relevant rules.",
          evidenceSignals: [`${evidence.activePolicies} configured policies`],
        };
      }
      return {
        status: "manual",
        rationale:
          "No organization policy set is active, so governance remains a documented/manual control outside the product.",
        evidenceSignals: [],
      };
    },
    customerResponsibilities: [
      "Define organization-specific policies and approval criteria.",
      "Review policy scope, false positives, and exceptions regularly.",
    ],
  },
  {
    id: "ACC-001",
    title: "Access Control And Accountability",
    capability:
      "API keys are organization-bound, environment-bound, auditable, and revocable.",
    mappings: [
      { framework: "ISO 27001", area: "A.9 Access control" },
      { framework: "ISO 42001", area: "Roles, accountability, and oversight" },
      { framework: "SOC 2 Type II", area: "CC6 Logical and physical access" },
    ],
    evaluate: (evidence) => {
      if (evidence.activeKeys > 0) {
        return {
          status: "covered",
          rationale:
            "Access keys are active and support environment attribution, revocation, and audit evidence.",
          evidenceSignals: [
            `${evidence.activeKeys} active API keys`,
            `${evidence.revokedKeysInPeriod} revocations in period`,
          ],
        };
      }
      return {
        status: "partial",
        rationale:
          "The access model exists, but no active key inventory is visible in the selected period.",
        evidenceSignals: [],
      };
    },
    customerResponsibilities: [
      "Assign least-privilege roles and disable stale identities.",
      "Operate joiner/mover/leaver processes outside the product.",
    ],
  },
  {
    id: "OPS-001",
    title: "Operational Logging And Monitoring",
    capability:
      "Telemetry, audit events, and policy violations create a traceable operational record.",
    mappings: [
      { framework: "ISO 27001", area: "A.12 Logging and monitoring" },
      { framework: "ISO 42001", area: "Operational monitoring of AI-assisted work" },
      { framework: "SOC 2 Type II", area: "CC7 System operations" },
    ],
    evaluate: (evidence) => {
      if (
        evidence.telemetryPushes > 0 &&
        evidence.auditEvents > 0 &&
        evidence.totalToolCalls > 0
      ) {
        return {
          status: "covered",
          rationale:
            "Telemetry, tool activity, and audit evidence are all present for the selected period.",
          evidenceSignals: [
            `${evidence.telemetryPushes} telemetry pushes`,
            `${evidence.auditEvents} audit events`,
            `${evidence.totalToolCalls} tool calls`,
          ],
        };
      }
      if (evidence.auditEvents > 0 || evidence.telemetryPushes > 0) {
        return {
          status: "partial",
          rationale:
            "Some operational evidence exists, but the full telemetry/audit/tool-activity chain is not consistently visible.",
          evidenceSignals: [
            `${evidence.telemetryPushes} telemetry pushes`,
            `${evidence.auditEvents} audit events`,
          ],
        };
      }
      return {
        status: "manual",
        rationale:
          "No meaningful telemetry or audit evidence is present for the selected period.",
        evidenceSignals: [],
      };
    },
    customerResponsibilities: [
      "Define alerting, escalation, and incident response around the exported evidence.",
      "Route evidence into SIEM/SOC workflows where required.",
    ],
  },
  {
    id: "WF-001",
    title: "Governed Development Workflow",
    capability:
      "Plan, review, implement, iterate, and approve steps are captured as workflow and review evidence.",
    mappings: [
      { framework: "ISO 27001", area: "Controlled change and secure development evidence" },
      { framework: "ISO 42001", area: "AI lifecycle oversight and human review" },
      { framework: "SOC 2 Type II", area: "CC1 / CC7 change governance evidence" },
    ],
    evaluate: (evidence) => {
      if (evidence.workflowSnapshots > 0 && evidence.reviewTotal > 0) {
        return {
          status: evidence.approvedWorkflowSnapshots > 0 ? "covered" : "partial",
          rationale:
            evidence.approvedWorkflowSnapshots > 0
              ? "Workflow snapshots and review evidence exist, including approved workflow states."
              : "Workflow snapshots and reviews exist, but no approved workflow evidence is visible yet.",
          evidenceSignals: [
            `${evidence.workflowSnapshots} workflow snapshots`,
            `${evidence.reviewTotal} review results`,
            `${evidence.reviewFailures} failed reviews`,
          ],
        };
      }
      return {
        status: "manual",
        rationale:
          "The governed workflow is not yet evidenced in the selected period.",
        evidenceSignals: [],
      };
    },
    customerResponsibilities: [
      "Require developers and reviewers to use the governed workflow consistently.",
      "Define what constitutes approval for your SDLC and change-management process.",
    ],
  },
  {
    id: "AI-001",
    title: "AI Data Boundary And Transparency",
    capability:
      "Outbound telemetry and audit are restricted to identifiers, counts, timestamps, and redacted metadata.",
    mappings: [
      { framework: "ISO 27001", area: "Information transfer and data minimization" },
      { framework: "ISO 42001", area: "AI transparency, oversight, and data handling" },
      { framework: "SOC 2 Type II", area: "CC2 / CC6 confidentiality and system boundaries" },
    ],
    evaluate: (evidence) => {
      if (evidence.boundaryDocumented && evidence.requiredAuditEvents > 0) {
        return {
          status: "covered",
          rationale:
            "The outbound boundary is documented and there is required audit evidence showing governed activity.",
          evidenceSignals: [
            "Documented telemetry/audit boundary",
            `${evidence.requiredAuditEvents} required audit events`,
          ],
        };
      }
      if (evidence.boundaryDocumented) {
        return {
          status: "partial",
          rationale:
            "The outbound boundary is documented, but the selected period does not yet show enough required audit evidence to demonstrate consistent use.",
          evidenceSignals: ["Documented telemetry/audit boundary"],
        };
      }
      return {
        status: "manual",
        rationale:
          "No documented product boundary is available to support a defensible data-minimization claim.",
        evidenceSignals: [],
      };
    },
    customerResponsibilities: [
      "Review outbound data policy against internal data classification rules.",
      "Approve any future exceptions that would allow richer outbound payloads.",
    ],
  },
];

export function buildControlMatrix(evidence: ComplianceEvidence) {
  const controls: ControlEntry[] = CONTROL_DEFINITIONS.map((definition) => {
    const evaluated = definition.evaluate(evidence);
    return {
      id: definition.id,
      title: definition.title,
      capability: definition.capability,
      status: evaluated.status,
      rationale: evaluated.rationale,
      evidenceSignals: evaluated.evidenceSignals,
      mappings: definition.mappings,
      customerResponsibilities: definition.customerResponsibilities,
    };
  });

  return {
    controls,
    summary: {
      covered: controls.filter((control) => control.status === "covered").length,
      partial: controls.filter((control) => control.status === "partial").length,
      manual: controls.filter((control) => control.status === "manual").length,
      total: controls.length,
    },
  };
}

export const RESIDUAL_CUSTOMER_RESPONSIBILITIES = [
  "Own certification scope, statement of applicability, and auditor-facing control narratives.",
  "Operate identity lifecycle, offboarding, and access reviews outside Cortex.",
  "Define incident response, exception management, and evidence export into SIEM/GRC workflows.",
  "Validate organization-specific policies, reviewer responsibilities, and approval gates.",
  "Review regulatory, contractual, and data-classification requirements before enabling AI tooling at scale.",
] as const;
