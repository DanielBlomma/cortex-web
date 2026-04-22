export type HealthStatus = "healthy" | "warning" | "critical";

export type ChecklistStatus = "complete" | "attention" | "pending";

export type OperationalSignal = {
  id: "policy" | "sync" | "telemetry" | "reviews";
  label: string;
  status: HealthStatus;
  summary: string;
  detail: string;
  href: string;
  metric: string;
  updatedAt: string | null;
};

export type RolloutChecklistItem = {
  id: string;
  title: string;
  status: ChecklistStatus;
  detail: string;
  href: string;
};

export type OperationalHealthInput = {
  plan: string;
  activePolicies: number;
  enforcedPolicies: number;
  blockingPolicies: number;
  activeApiKeys: number;
  activeInstances: number;
  distinctVersions: number;
  lastPolicySyncAt: string | null;
  lastTelemetryAt: string | null;
  totalToolCalls: number;
  failedToolCalls: number;
  workflowSessions30d: number;
  reviewedSessions30d: number;
  approvedSessions30d: number;
  blockedSessions30d: number;
  requiredAuditEvents30d: number;
  lastAuditAt: string | null;
};

export type OperationalHealthSummary = {
  package: {
    plan: string;
    activeApiKeys: number;
    activeInstances: number;
    distinctVersions: number;
  };
  signals: {
    policyHealth: OperationalSignal;
    syncStatus: OperationalSignal;
    telemetryHealth: OperationalSignal;
    reviewCoverage: OperationalSignal;
  };
  checklist: RolloutChecklistItem[];
};

function hoursSince(timestamp: string | null, now = Date.now()): number | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp).getTime();
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, (now - parsed) / 3_600_000);
}

function freshnessStatus(hours: number | null): HealthStatus {
  if (hours === null) return "critical";
  if (hours <= 24) return "healthy";
  if (hours <= 72) return "warning";
  return "critical";
}

function checklistStatus(ok: boolean, inProgress: boolean): ChecklistStatus {
  if (ok) return "complete";
  return inProgress ? "attention" : "pending";
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function buildOperationalHealthSummary(
  input: OperationalHealthInput,
): OperationalHealthSummary {
  const failureRate =
    input.totalToolCalls > 0 ? input.failedToolCalls / input.totalToolCalls : 0;
  const reviewCoveragePct = percent(
    input.reviewedSessions30d,
    input.workflowSessions30d,
  );

  const policyHealthStatus: HealthStatus =
    input.activePolicies === 0
      ? "critical"
      : input.enforcedPolicies === 0 || input.blockingPolicies === 0
        ? "warning"
        : "healthy";

  const syncAgeHours = hoursSince(input.lastPolicySyncAt);
  const syncStatus =
    input.activePolicies === 0 && input.lastPolicySyncAt === null
      ? "warning"
      : freshnessStatus(syncAgeHours);

  const telemetryAgeHours = hoursSince(input.lastTelemetryAt);
  let telemetryStatus: HealthStatus =
    input.activeInstances === 0 && input.lastTelemetryAt === null
      ? "warning"
      : freshnessStatus(telemetryAgeHours);
  if (failureRate >= 0.5) {
    telemetryStatus = "critical";
  } else if (failureRate >= 0.2 && telemetryStatus === "healthy") {
    telemetryStatus = "warning";
  } else if (input.distinctVersions > 2 && telemetryStatus === "healthy") {
    telemetryStatus = "warning";
  }

  const reviewCoverageStatus: HealthStatus =
    input.workflowSessions30d === 0
      ? "warning"
      : reviewCoveragePct >= 90
        ? "healthy"
        : reviewCoveragePct >= 60
          ? "warning"
          : "critical";

  const signals = {
    policyHealth: {
      id: "policy" as const,
      label: "Policy health",
      status: policyHealthStatus,
      summary:
        input.activePolicies === 0
          ? "No active policies are published."
          : `${input.activePolicies} active policies, ${input.enforcedPolicies} enforced.`,
      detail:
        input.activePolicies === 0
          ? "Publish at least one active policy before onboarding more teams."
          : input.blockingPolicies === 0
            ? "Policies exist, but none currently block or error on unsafe changes."
            : "The control plane has active blocking policies ready for rollout.",
      href: "/dashboard/policies",
      metric: `${input.activePolicies} active`,
      updatedAt: input.lastPolicySyncAt,
    },
    syncStatus: {
      id: "sync" as const,
      label: "Sync status",
      status: syncStatus,
      summary:
        input.lastPolicySyncAt === null
          ? "No policy sync has been observed yet."
          : `Last policy sync ${Math.round(syncAgeHours ?? 0)}h ago.`,
      detail:
        input.lastPolicySyncAt === null
          ? "Create a key, connect an instance, and trigger the first sync from cortex-enterprise."
          : "Use this to verify that the dashboard is still the active control plane.",
      href: "/dashboard/api-keys",
      metric:
        input.lastPolicySyncAt === null ? "awaiting first sync" : "synced",
      updatedAt: input.lastPolicySyncAt,
    },
    telemetryHealth: {
      id: "telemetry" as const,
      label: "Telemetry health",
      status: telemetryStatus,
      summary:
        input.lastTelemetryAt === null
          ? "No telemetry has been received from enterprise clients."
          : `${input.activeInstances} active instances reporting across ${input.distinctVersions} client versions.`,
      detail:
        input.lastTelemetryAt === null
          ? "Telemetry is required to verify rollout health, version drift, and activity."
          : failureRate >= 0.2
            ? `${Math.round(failureRate * 100)}% of tool calls are failing and should be investigated.`
            : "Telemetry is fresh enough to support operational monitoring.",
      href: "/dashboard/analytics",
      metric:
        input.totalToolCalls > 0
          ? `${Math.round((1 - failureRate) * 100)}% success`
          : "no activity",
      updatedAt: input.lastTelemetryAt,
    },
    reviewCoverage: {
      id: "reviews" as const,
      label: "Review coverage",
      status: reviewCoverageStatus,
      summary:
        input.workflowSessions30d === 0
          ? "No governed workflow sessions have been recorded in the last 30 days."
          : `${reviewCoveragePct}% of workflow sessions include review evidence.`,
      detail:
        input.workflowSessions30d === 0
          ? "Teams are not yet producing the governed workflow evidence needed for rollout."
          : `${input.approvedSessions30d} approved sessions, ${input.blockedSessions30d} blocked sessions, ${input.requiredAuditEvents30d} required audit events in the last 30 days.`,
      href: "/dashboard/reviews",
      metric:
        input.workflowSessions30d === 0
          ? "0 sessions"
          : `${reviewCoveragePct}% covered`,
      updatedAt: input.lastAuditAt,
    },
  };

  const checklist: RolloutChecklistItem[] = [
    {
      id: "keys",
      title: "Provision environment keys",
      status: checklistStatus(input.activeApiKeys > 0, input.plan !== "free"),
      detail:
        input.activeApiKeys > 0
          ? `${input.activeApiKeys} active API keys issued.`
          : "Create at least one admin-managed API key before onboarding instances.",
      href: "/dashboard/api-keys",
    },
    {
      id: "instances",
      title: "Connect enterprise instances",
      status: checklistStatus(
        input.activeInstances > 0,
        input.activeApiKeys > 0,
      ),
      detail:
        input.activeInstances > 0
          ? `${input.activeInstances} instances are reporting telemetry.`
          : "No connected enterprise instances are reporting yet.",
      href: "/dashboard/analytics",
    },
    {
      id: "policies",
      title: "Publish active governance policies",
      status: checklistStatus(
        input.activePolicies > 0,
        input.activeApiKeys > 0,
      ),
      detail:
        input.activePolicies > 0
          ? `${input.activePolicies} active policies available for sync.`
          : "The dashboard has no active policies to distribute yet.",
      href: "/dashboard/policies",
    },
    {
      id: "workflow",
      title: "Capture governed workflow evidence",
      status: checklistStatus(
        input.workflowSessions30d > 0 && input.reviewedSessions30d > 0,
        input.activeInstances > 0,
      ),
      detail:
        input.workflowSessions30d > 0 && input.reviewedSessions30d > 0
          ? `${input.reviewedSessions30d} reviewed workflow sessions recorded in the last 30 days.`
          : "Plan, review, and approval evidence is not yet consistently reaching the dashboard.",
      href: "/dashboard/reviews",
    },
    {
      id: "audit",
      title: "Collect audit-grade evidence",
      status: checklistStatus(
        input.requiredAuditEvents30d > 0,
        input.activeInstances > 0,
      ),
      detail:
        input.requiredAuditEvents30d > 0
          ? `${input.requiredAuditEvents30d} required audit events captured in the last 30 days.`
          : "Required audit events have not been observed yet.",
      href: "/dashboard/audit",
    },
  ];

  return {
    package: {
      plan: input.plan,
      activeApiKeys: input.activeApiKeys,
      activeInstances: input.activeInstances,
      distinctVersions: input.distinctVersions,
    },
    signals,
    checklist,
  };
}
