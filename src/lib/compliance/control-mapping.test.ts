import { describe, expect, it } from "vitest";
import { buildControlMatrix } from "./control-mapping";

describe("buildControlMatrix", () => {
  it("marks strong evidence as covered", () => {
    const result = buildControlMatrix({
      activePolicies: 5,
      enforcedPolicies: 4,
      activeKeys: 3,
      revokedKeysInPeriod: 1,
      telemetryPushes: 10,
      totalToolCalls: 100,
      auditEvents: 50,
      requiredAuditEvents: 20,
      clientAuditEvents: 30,
      reviewTotal: 25,
      reviewFailures: 3,
      workflowSnapshots: 12,
      approvedWorkflowSnapshots: 4,
      boundaryDocumented: true,
    });

    expect(result.summary.covered).toBeGreaterThan(0);
    expect(result.controls.find((control) => control.id === "GOV-001")?.status).toBe(
      "covered"
    );
  });

  it("keeps unsupported areas manual", () => {
    const result = buildControlMatrix({
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

    expect(result.summary.manual).toBeGreaterThan(0);
    expect(result.controls.find((control) => control.id === "AI-001")?.status).toBe(
      "manual"
    );
  });
});
