import { describe, expect, it } from "vitest";
import { buildControlMatrix } from "./control-mapping";
import { buildComplianceReportContract } from "./report-contract";
import {
  BASELINE_COMPLIANCE_FRAMEWORKS,
  PLANNED_EU_REGULATORY_PACKS,
} from "./frameworks";
import { buildRegulatoryPackPreview } from "./regulatory-pack-preview";

describe("buildComplianceReportContract", () => {
  it("uses the shared baseline framework list in report metadata", () => {
    const controlMapping = buildControlMatrix({
      activePolicies: 1,
      enforcedPolicies: 1,
      activeKeys: 1,
      revokedKeysInPeriod: 0,
      telemetryPushes: 1,
      totalToolCalls: 1,
      auditEvents: 1,
      requiredAuditEvents: 1,
      clientAuditEvents: 1,
      reviewTotal: 1,
      reviewFailures: 0,
      workflowSnapshots: 1,
      approvedWorkflowSnapshots: 1,
      boundaryDocumented: true,
    });

    const report = buildComplianceReportContract({
      generatedAt: "2026-04-29T10:00:00.000Z",
      periodFrom: "2026-04-01",
      periodTo: "2026-04-29",
      orgId: "org_123",
      controlMapping,
      regulatoryPackPreview: buildRegulatoryPackPreview({
        activePolicies: [],
        violationsByRule: [],
      }),
    });

    expect(report.meta.framework).toEqual([...BASELINE_COMPLIANCE_FRAMEWORKS]);
  });

  it("preserves the computed control mapping in the report contract", () => {
    const controlMapping = buildControlMatrix({
      activePolicies: 0,
      enforcedPolicies: 0,
      activeKeys: 0,
      revokedKeysInPeriod: 0,
      telemetryPushes: 0,
      totalToolCalls: 0,
      auditEvents: 0,
      requiredAuditEvents: 0,
      clientAuditEvents: 0,
      reviewTotal: 0,
      reviewFailures: 0,
      workflowSnapshots: 0,
      approvedWorkflowSnapshots: 0,
      boundaryDocumented: false,
    });

    const report = buildComplianceReportContract({
      generatedAt: "2026-04-29T10:00:00.000Z",
      periodFrom: "2026-04-01",
      periodTo: "2026-04-29",
      orgId: "org_123",
      controlMapping,
      regulatoryPackPreview: buildRegulatoryPackPreview({
        activePolicies: [],
        violationsByRule: [],
      }),
    });

    expect(report.controlMapping).toEqual(controlMapping);
    expect(report.controlMapping.summary.total).toBe(controlMapping.controls.length);
  });

  it("includes residual responsibilities in the report contract", () => {
    const controlMapping = buildControlMatrix({
      activePolicies: 0,
      enforcedPolicies: 0,
      activeKeys: 0,
      revokedKeysInPeriod: 0,
      telemetryPushes: 0,
      totalToolCalls: 0,
      auditEvents: 0,
      requiredAuditEvents: 0,
      clientAuditEvents: 0,
      reviewTotal: 0,
      reviewFailures: 0,
      workflowSnapshots: 0,
      approvedWorkflowSnapshots: 0,
      boundaryDocumented: false,
    });

    const report = buildComplianceReportContract({
      generatedAt: "2026-04-29T10:00:00.000Z",
      periodFrom: "2026-04-01",
      periodTo: "2026-04-29",
      orgId: "org_123",
      controlMapping,
      regulatoryPackPreview: buildRegulatoryPackPreview({
        activePolicies: [],
        violationsByRule: [],
      }),
    });

    expect(report.residualResponsibilities.length).toBeGreaterThan(0);
    expect(report.residualResponsibilities).toContain(
      "Own certification scope, statement of applicability, and auditor-facing control narratives."
    );
  });

  it("keeps planned EU regulatory packs out of meta.framework and exposes them as preview", () => {
    const controlMapping = buildControlMatrix({
      activePolicies: 1,
      enforcedPolicies: 1,
      activeKeys: 1,
      revokedKeysInPeriod: 0,
      telemetryPushes: 1,
      totalToolCalls: 1,
      auditEvents: 1,
      requiredAuditEvents: 1,
      clientAuditEvents: 1,
      reviewTotal: 1,
      reviewFailures: 0,
      workflowSnapshots: 1,
      approvedWorkflowSnapshots: 1,
      boundaryDocumented: true,
    });

    const regulatoryPackPreview = buildRegulatoryPackPreview({
      activePolicies: [
        {
          id: "p1",
          ruleId: "no-env-in-prompts",
          title: "No Env In Prompts",
          status: "active",
          severity: "block",
          enforce: true,
        },
      ],
      violationsByRule: [],
    });

    const report = buildComplianceReportContract({
      generatedAt: "2026-04-29T10:00:00.000Z",
      periodFrom: "2026-04-01",
      periodTo: "2026-04-29",
      orgId: "org_123",
      controlMapping,
      regulatoryPackPreview,
    });

    for (const pack of PLANNED_EU_REGULATORY_PACKS) {
      expect(report.meta.framework).not.toContain(pack);
    }
    expect(report.regulatoryPackPreview).toEqual(regulatoryPackPreview);
    for (const entry of report.regulatoryPackPreview) {
      expect(entry.evidenceLevel).toBe("preview");
    }
    const gdpr = report.regulatoryPackPreview.find((p) => p.pack === "GDPR");
    expect(gdpr?.policyCount).toBe(1);
  });
});
