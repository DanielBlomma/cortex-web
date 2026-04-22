import { describe, expect, it } from "vitest";
import { buildOperationalHealthSummary } from "./health";

describe("buildOperationalHealthSummary", () => {
  it("marks a mature rollout healthy", () => {
    const result = buildOperationalHealthSummary({
      plan: "cloud",
      activePolicies: 8,
      enforcedPolicies: 8,
      blockingPolicies: 5,
      activeApiKeys: 3,
      activeInstances: 6,
      distinctVersions: 1,
      lastPolicySyncAt: new Date().toISOString(),
      lastTelemetryAt: new Date().toISOString(),
      totalToolCalls: 200,
      failedToolCalls: 4,
      workflowSessions30d: 20,
      reviewedSessions30d: 19,
      approvedSessions30d: 14,
      blockedSessions30d: 2,
      requiredAuditEvents30d: 80,
      lastAuditAt: new Date().toISOString(),
    });

    expect(result.signals.policyHealth.status).toBe("healthy");
    expect(result.signals.syncStatus.status).toBe("healthy");
    expect(result.signals.telemetryHealth.status).toBe("healthy");
    expect(result.signals.reviewCoverage.status).toBe("healthy");
    expect(result.checklist.every((item) => item.status === "complete")).toBe(
      true,
    );
  });

  it("flags onboarding gaps without pretending the rollout is healthy", () => {
    const result = buildOperationalHealthSummary({
      plan: "cloud",
      activePolicies: 0,
      enforcedPolicies: 0,
      blockingPolicies: 0,
      activeApiKeys: 1,
      activeInstances: 0,
      distinctVersions: 0,
      lastPolicySyncAt: null,
      lastTelemetryAt: null,
      totalToolCalls: 0,
      failedToolCalls: 0,
      workflowSessions30d: 0,
      reviewedSessions30d: 0,
      approvedSessions30d: 0,
      blockedSessions30d: 0,
      requiredAuditEvents30d: 0,
      lastAuditAt: null,
    });

    expect(result.signals.policyHealth.status).toBe("critical");
    expect(result.signals.syncStatus.status).toBe("warning");
    expect(result.signals.telemetryHealth.status).toBe("warning");
    expect(
      result.checklist.find((item) => item.id === "policies")?.status,
    ).toBe("attention");
  });

  it("treats stale telemetry and weak review coverage as rollout risks", () => {
    const fourDaysAgo = new Date(Date.now() - 96 * 3_600_000).toISOString();
    const result = buildOperationalHealthSummary({
      plan: "cloud",
      activePolicies: 4,
      enforcedPolicies: 4,
      blockingPolicies: 2,
      activeApiKeys: 2,
      activeInstances: 3,
      distinctVersions: 3,
      lastPolicySyncAt: fourDaysAgo,
      lastTelemetryAt: fourDaysAgo,
      totalToolCalls: 100,
      failedToolCalls: 40,
      workflowSessions30d: 10,
      reviewedSessions30d: 4,
      approvedSessions30d: 2,
      blockedSessions30d: 3,
      requiredAuditEvents30d: 6,
      lastAuditAt: fourDaysAgo,
    });

    expect(result.signals.syncStatus.status).toBe("critical");
    expect(result.signals.telemetryHealth.status).toBe("critical");
    expect(result.signals.reviewCoverage.status).toBe("critical");
  });
});
