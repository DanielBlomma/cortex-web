"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Zap,
  Users,
  ShieldCheck,
  ShieldAlert,
  Key,
  Activity,
  ArrowRight,
  Package,
  AlertTriangle,
  HeartPulse,
  RefreshCw,
  ClipboardCheck,
  CheckCircle2,
  CircleDot,
  AlertCircle,
} from "lucide-react";
import { DashboardInfoButton } from "@/components/dashboard/dashboard-info-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dashboardHelp } from "@/lib/dashboard/help-content";
import Link from "next/link";
import type { Policy } from "@/lib/types/policy";

type Totals = {
  searches: number;
  tokensSaved: number;
  tokensTotal: number;
  tokensReported: boolean;
  eventCount: number;
  activeInstances: number;
};

type VersionInfo = {
  version: string;
  instances: number;
  lastSeen: string;
};

type TelemetrySummary = {
  totals: Totals;
  versions: VersionInfo[];
  daily: { date: string; searches: number }[];
};

type ViolationSummary = {
  severity: { error: number; warning: number; info: number };
  total: number;
  recent: {
    id: string;
    ruleId: string;
    ruleTitle: string;
    policySeverity: Policy["severity"] | null;
    policyStatus: Policy["status"] | null;
    severity: string;
    message: string;
    repo: string | null;
    occurredAt: string;
  }[];
};

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

type OverviewPolicy = Pick<
  Policy,
  "id" | "title" | "ruleId" | "status" | "severity" | "enforce" | "createdAt"
> & {
  lastTriggeredAt?: string | null;
  recentlyTriggered?: boolean;
};

type OperationsSignal = {
  id: "policy" | "sync" | "telemetry" | "reviews";
  label: string;
  status: "healthy" | "warning" | "critical";
  summary: string;
  detail: string;
  href: string;
  metric: string;
  updatedAt: string | null;
};

type OperationsSummary = {
  generatedAt: string;
  summary: {
    package: {
      plan: string;
      activeApiKeys: number;
      activeInstances: number;
      distinctVersions: number;
    };
    signals: {
      policyHealth: OperationsSignal;
      syncStatus: OperationsSignal;
      telemetryHealth: OperationsSignal;
      reviewCoverage: OperationsSignal;
    };
    checklist: {
      id: string;
      title: string;
      status: "complete" | "attention" | "pending";
      detail: string;
      href: string;
    }[];
  };
};

type OrgScopeSuggestion = {
  ownerId: string;
  name: string;
  slug: string;
  telemetryEvents: number;
  auditEvents: number;
  violationCount: number;
  reviewCount: number;
  workflowCount: number;
  apiKeyCount: number;
  policyCount: number;
  totalSignals: number;
};

type OrgScopeMismatch = {
  code: "org_scope_mismatch";
  error: string;
  ownerId: string;
  availableScopes: OrgScopeSuggestion[];
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const policyStatusBadgeClass: Record<Policy["status"], string> = {
  active: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
  draft: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  disabled: "text-zinc-400 border-white/10 bg-black/20",
  archived: "text-zinc-500 border-white/10 bg-black/30",
};

const policySeverityBadgeClass: Record<Policy["severity"], string> = {
  block: "text-red-400 border-red-400/20 bg-red-400/10",
  error: "text-orange-400 border-orange-400/20 bg-orange-400/10",
  warning: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  info: "text-sky-300 border-sky-400/20 bg-sky-400/10",
};

const operationsBadgeClass: Record<OperationsSignal["status"], string> = {
  healthy: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
  warning: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  critical: "text-red-400 border-red-400/20 bg-red-400/10",
};

const checklistBadgeClass: Record<
  OperationsSummary["summary"]["checklist"][number]["status"],
  string
> = {
  complete: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
  attention: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  pending: "text-zinc-400 border-white/10 bg-black/20",
};

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const [violations, setViolations] = useState<ViolationSummary | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [totalKeys, setTotalKeys] = useState(0);
  const [policies, setPolicies] = useState<OverviewPolicy[]>([]);
  const [totalPolicies, setTotalPolicies] = useState(0);
  const [operations, setOperations] = useState<OperationsSummary | null>(null);
  const [scopeMismatch, setScopeMismatch] = useState<OrgScopeMismatch | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const readJson = async <T,>(url: string): Promise<T> => {
      const res = await fetch(url);
      const data = (await res.json().catch(() => null)) as
        | Record<string, unknown>
        | null;
      if (!res.ok) {
        if (data?.code === "org_scope_mismatch") {
          const mismatch = data as unknown as OrgScopeMismatch;
          const mismatchError = new Error(mismatch.error) as Error & {
            code: string;
            scopeMismatch: OrgScopeMismatch;
          };
          mismatchError.code = mismatch.code;
          mismatchError.scopeMismatch = mismatch;
          throw mismatchError;
        }

        const message =
          typeof data?.error === "string" ? data.error : `Failed to load ${url}`;
        const detail =
          typeof data?.detail === "string" ? ` (${data.detail})` : "";
        throw new Error(
          `${message}${detail}`,
        );
      }
      return data as T;
    };

    type OverviewPayload = {
      telemetry: TelemetrySummary;
      violations: ViolationSummary;
      access: {
        totalKeys: number;
        keys: ApiKey[];
      };
      policies: {
        totalPolicies: number;
        items: OverviewPolicy[];
      };
      operations: OperationsSummary;
    };

    try {
      const payload = await readJson<OverviewPayload>("/api/v1/dashboard/overview");
      setTelemetry(payload.telemetry);
      setViolations(payload.violations);
      setKeys(payload.access.keys ?? []);
      setTotalKeys(payload.access.totalKeys ?? 0);
      setPolicies(payload.policies.items ?? []);
      setTotalPolicies(payload.policies.totalPolicies ?? 0);
      setOperations(payload.operations);
      setScopeMismatch(null);
      setError(null);
    } catch (fetchError) {
      if (
        fetchError &&
        typeof fetchError === "object" &&
        "code" in fetchError &&
        fetchError.code === "org_scope_mismatch" &&
        "scopeMismatch" in fetchError
      ) {
        setScopeMismatch(fetchError.scopeMismatch as OrgScopeMismatch);
        setError(null);
        return;
      }

      setScopeMismatch(null);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchAll();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchAll]);

  const totals = telemetry?.totals;
  const hasData = totals && totals.eventCount > 0;
  const operationalSignals = operations
    ? [
        operations.summary.signals.policyHealth,
        operations.summary.signals.syncStatus,
        operations.summary.signals.telemetryHealth,
        operations.summary.signals.reviewCoverage,
      ]
    : [];

  const daily = telemetry?.daily ?? [];
  const maxSearches = Math.max(...daily.map((d) => Number(d.searches)), 1);

  if (scopeMismatch && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Overview</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Your organization&apos;s Cortex status at a glance.
            </p>
          </div>
          <DashboardInfoButton
            content={dashboardHelp.overviewPage}
            variant="pill"
            label="Page guide"
          />
        </div>

        <Card className="border-amber-400/20 bg-amber-400/10">
          <CardHeader>
            <CardTitle className="text-base text-amber-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              This organization has no Cortex data yet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-amber-50/90">
                You are currently scoped to{" "}
                <span className="font-mono text-amber-100">
                  {scopeMismatch.ownerId}
                </span>
                , but Cortex data exists under another organization in this
                environment.
              </p>
              <p className="text-sm text-amber-100/70">
                Use the organization switcher in the header to move to the org
                that actually owns the telemetry, audit, policy, and rollout
                data.
              </p>
            </div>

            {scopeMismatch.availableScopes.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {scopeMismatch.availableScopes.map((scope) => (
                  <div
                    key={scope.ownerId}
                    className="rounded-xl border border-amber-300/15 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {scope.name}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          `{scope.slug}`
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-2 font-mono">
                          {scope.ownerId}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-amber-200 border-amber-300/20 bg-amber-300/10"
                      >
                        {formatNumber(scope.totalSignals)} signals
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      {scope.telemetryEvents > 0 && (
                        <Badge
                          variant="outline"
                          className="text-emerald-300 border-emerald-400/20 bg-emerald-400/10"
                        >
                          {formatNumber(scope.telemetryEvents)} telemetry
                        </Badge>
                      )}
                      {scope.auditEvents > 0 && (
                        <Badge
                          variant="outline"
                          className="text-sky-200 border-sky-400/20 bg-sky-400/10"
                        >
                          {formatNumber(scope.auditEvents)} audit
                        </Badge>
                      )}
                      {scope.violationCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-amber-200 border-amber-300/20 bg-amber-300/10"
                        >
                          {formatNumber(scope.violationCount)} violations
                        </Badge>
                      )}
                      {scope.reviewCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-violet-200 border-violet-400/20 bg-violet-400/10"
                        >
                          {formatNumber(scope.reviewCount)} reviews
                        </Badge>
                      )}
                      {scope.workflowCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-zinc-200 border-white/10 bg-white/5"
                        >
                          {formatNumber(scope.workflowCount)} workflows
                        </Badge>
                      )}
                      {scope.policyCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-zinc-200 border-white/10 bg-white/5"
                        >
                          {formatNumber(scope.policyCount)} policies
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">
                Cortex data exists in this environment, but no other accessible
                organization with data could be identified for your current
                session. Double-check that you are in the right Clerk
                organization or that your membership has been synced.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Your organization&apos;s Cortex status at a glance.
          </p>
        </div>
        <DashboardInfoButton
          content={dashboardHelp.overviewPage}
          variant="pill"
          label="Page guide"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-zinc-400" />
              Operational Health
              <DashboardInfoButton
                content={dashboardHelp.overviewOperationalHealth}
              />
            </CardTitle>
            {operations?.summary.package && (
              <Badge
                variant="outline"
                className="text-zinc-300 border-white/10 bg-black/20"
              >
                {operations.summary.package.plan}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {operationalSignals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {operationalSignals.map((signal) => (
                  <Link
                    key={signal.id}
                    href={signal.href}
                    className="rounded-xl border border-white/5 bg-black/20 p-4 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={operationsBadgeClass[signal.status]}
                      >
                        {signal.status}
                      </Badge>
                      <span className="text-sm font-medium text-white">
                        {signal.label}
                      </span>
                      <span className="ml-auto text-xs text-zinc-500">
                        {signal.metric}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-200">
                      {signal.summary}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {signal.detail}
                    </p>
                    {signal.updatedAt && (
                      <div className="mt-3 flex items-center gap-1 text-[11px] text-zinc-600">
                        <RefreshCw className="h-3 w-3" />
                        Updated {timeAgo(signal.updatedAt)}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">
                Operational health will appear after the first enterprise sync.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-zinc-400" />
              Rollout Checklist
              <DashboardInfoButton
                content={dashboardHelp.overviewRolloutChecklist}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {operations?.summary.checklist?.length ? (
              <div className="space-y-3">
                {operations.summary.checklist.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-lg border border-white/5 bg-black/20 px-3 py-3 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {item.status === "complete" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : item.status === "attention" ? (
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                      ) : (
                        <CircleDot className="h-4 w-4 text-zinc-500" />
                      )}
                      <span className="text-sm text-white">{item.title}</span>
                      <Badge
                        variant="outline"
                        className={`ml-auto ${checklistBadgeClass[item.status]}`}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">{item.detail}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">
                Rollout checklist data will appear once the first API key is
                provisioned.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Searches
            </CardTitle>
            <Search className="h-4 w-4 text-zinc-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? "..." : hasData ? formatNumber(totals.searches) : "—"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Token Efficiency
            </CardTitle>
            <Zap className="h-4 w-4 text-emerald-500/50" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-white">...</div>
            ) : hasData && totals.tokensSaved > 0 ? (
              totals.tokensReported && totals.tokensTotal > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-400">
                      {Math.round(
                        totals.tokensTotal /
                          Math.max(totals.tokensTotal - totals.tokensSaved, 1),
                      )}
                      x
                    </span>
                    <span className="text-xs text-zinc-500">reduction</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Raw dump:</span>
                      <span className="text-zinc-300">
                        ~{formatNumber(totals.tokensTotal)} tokens
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Cortex search:</span>
                      <span className="text-emerald-400">
                        ~{formatNumber(totals.tokensTotal - totals.tokensSaved)}{" "}
                        tokens
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.round((totals.tokensSaved / totals.tokensTotal) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-emerald-400 text-right">
                    {Math.round(
                      (totals.tokensSaved / totals.tokensTotal) * 100,
                    )}
                    % less tokens
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-emerald-400">
                    ~{formatNumber(totals.tokensSaved)}
                  </div>
                  <p className="text-xs text-zinc-500">tokens saved total</p>
                </div>
              )
            ) : (
              <div className="text-2xl font-bold text-white">—</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Violations
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-zinc-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {loading
                  ? "..."
                  : violations
                    ? formatNumber(violations.total)
                    : "0"}
              </span>
              {violations && violations.severity.error > 0 && (
                <span className="text-xs text-red-400">
                  {violations.severity.error} errors
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Instances
            </CardTitle>
            <Users className="h-4 w-4 text-zinc-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading
                ? "..."
                : hasData
                  ? totals.activeInstances.toString()
                  : "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle row: Search chart + Violations breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Searches mini chart */}
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-zinc-400" />
              Searches — Last {daily.length || 30} Days
              <DashboardInfoButton content={dashboardHelp.overviewSearchActivity} />
            </CardTitle>
            <Link
              href="/dashboard/analytics"
              className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
            >
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {daily.length > 0 ? (
              <div className="flex gap-[3px] h-24">
                {daily.map((d) => {
                  const height = Math.max(
                    (Number(d.searches) / maxSearches) * 100,
                    2,
                  );
                  return (
                    <div
                      key={d.date}
                      className="group relative flex-1 h-full flex flex-col justify-end"
                    >
                      <div
                        className="w-full rounded-sm bg-gradient-to-t from-blue-500/60 to-violet-500/40 hover:from-blue-400/80 hover:to-violet-400/60 transition-colors"
                        style={{ height: `${height}%` }}
                      />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                        <div className="bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white whitespace-nowrap">
                          {d.date}: {Number(d.searches)} searches
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No telemetry data yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Violations summary */}
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Violations
              <DashboardInfoButton content={dashboardHelp.overviewViolations} />
            </CardTitle>
            <Link
              href="/dashboard/violations"
              className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {violations && violations.total > 0 ? (
              <div className="space-y-3">
                <div className="flex gap-4 text-sm">
                  <span className="text-red-400">
                    {violations.severity.error} errors
                  </span>
                  <span className="text-amber-400">
                    {violations.severity.warning} warnings
                  </span>
                  <span className="text-blue-400">
                    {violations.severity.info} info
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
                  {violations.total > 0 && (
                    <>
                      <div
                        className="h-full bg-red-400/60"
                        style={{
                          width: `${(violations.severity.error / violations.total) * 100}%`,
                        }}
                      />
                      <div
                        className="h-full bg-amber-400/50"
                        style={{
                          width: `${(violations.severity.warning / violations.total) * 100}%`,
                        }}
                      />
                      <div
                        className="h-full bg-blue-400/30"
                        style={{
                          width: `${(violations.severity.info / violations.total) * 100}%`,
                        }}
                      />
                    </>
                  )}
                </div>
                {violations.recent.slice(0, 3).map((v) => (
                  <div
                    key={v.id}
                    className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          v.severity === "error"
                            ? "text-red-400 border-red-400/20 bg-red-400/10"
                            : v.severity === "warning"
                              ? "text-amber-400 border-amber-400/20 bg-amber-400/10"
                              : "text-blue-400 border-blue-400/20 bg-blue-400/10"
                        }
                      >
                        {v.severity}
                      </Badge>
                      {v.policyStatus && (
                        <Badge
                          variant="outline"
                          className={policyStatusBadgeClass[v.policyStatus]}
                        >
                          {v.policyStatus}
                        </Badge>
                      )}
                      {v.policySeverity && (
                        <Badge
                          variant="outline"
                          className={policySeverityBadgeClass[v.policySeverity]}
                        >
                          {v.policySeverity}
                        </Badge>
                      )}
                      <span className="text-zinc-500 ml-auto">
                        {timeAgo(v.occurredAt)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="truncate text-zinc-200">
                        {v.ruleTitle}
                      </span>
                      <span className="truncate font-mono text-zinc-500">
                        {v.ruleId}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-zinc-500">
                      <span className="truncate">{v.message}</span>
                      {v.repo && (
                        <span className="ml-auto truncate max-w-[120px]">
                          {v.repo}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No violations recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Versions, API Keys, Policies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Versions running */}
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-zinc-400" />
              Cortex Versions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const known = telemetry?.versions?.filter(
                (v) => v.version !== "unknown",
              );
              if (known && known.length > 0) {
                return (
                  <div className="space-y-3">
                    {known.map((v) => (
                      <div
                        key={v.version}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-white">
                            v{v.version}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {v.instances}{" "}
                            {v.instances === 1 ? "instance" : "instances"}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-600">
                          {timeAgo(v.lastSeen)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }
              const total = telemetry?.totals?.activeInstances ?? 0;
              return (
                <div className="space-y-2">
                  {total > 0 ? (
                    <>
                      <p className="text-sm text-zinc-400">
                        {total} active {total === 1 ? "instance" : "instances"}
                      </p>
                      <p className="text-xs text-zinc-600">
                        Update cortex-enterprise to v0.2+ to report version
                        info.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-600">
                      No instances connected yet.
                    </p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Active API Keys */}
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-zinc-400" />
              Access
              <DashboardInfoButton content={dashboardHelp.overviewAccess} />
              <span className="text-zinc-500 text-sm font-normal">
                ({totalKeys})
              </span>
            </CardTitle>
            <Link
              href="/dashboard/api-keys"
              className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
            >
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {keys.length > 0 ? (
              <div className="space-y-2.5">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white truncate">{k.name}</span>
                      <span className="text-zinc-600 font-mono text-xs">
                        {k.keyPrefix}...
                      </span>
                    </div>
                    <span className="text-xs text-zinc-600 shrink-0">
                      {k.lastUsedAt ? timeAgo(k.lastUsedAt) : "never used"}
                    </span>
                  </div>
                ))}
                {totalKeys > keys.length && (
                  <p className="text-xs text-zinc-600">
                    +{totalKeys - keys.length} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No API keys created yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Active Policies */}
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-zinc-400" />
              Policies
              <DashboardInfoButton content={dashboardHelp.overviewPolicies} />
              <span className="text-zinc-500 text-sm font-normal">
                ({totalPolicies})
              </span>
            </CardTitle>
            <Link
              href="/dashboard/policies"
              className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
            >
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {policies.length > 0 ? (
              <div className="space-y-2.5">
                {policies.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm text-white">
                          {p.title}
                        </span>
                        <span className="truncate font-mono text-[11px] text-zinc-500">
                          {p.ruleId}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={policyStatusBadgeClass[p.status]}
                        >
                          {p.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={policySeverityBadgeClass[p.severity]}
                        >
                          {p.severity}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            p.enforce
                              ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                              : "text-zinc-400 border-white/10 bg-black/20"
                          }
                        >
                          {p.enforce ? "blocking" : "advisory"}
                        </Badge>
                        {p.recentlyTriggered && (
                          <Badge
                            variant="outline"
                            className="text-red-300 border-red-400/20 bg-red-400/10"
                          >
                            triggered{" "}
                            {timeAgo(p.lastTriggeredAt ?? p.createdAt)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {totalPolicies > policies.length && (
                  <p className="text-xs text-zinc-600">
                    +{totalPolicies - policies.length} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No policies configured.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token savings bar — only show when we have real reported data */}
      {hasData &&
        totals.tokensReported &&
        totals.tokensSaved > 0 &&
        totals.tokensTotal > 0 && (
          <Card className="bg-white/[0.02] border-white/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">
                    Token Savings
                  </span>
                  <DashboardInfoButton
                    content={dashboardHelp.overviewTokenSavings}
                  />
                </div>
                <div className="text-right text-sm">
                  <span className="text-emerald-400 font-bold">
                    {Math.round(
                      (totals.tokensSaved / totals.tokensTotal) * 100,
                    )}
                    %
                  </span>
                  <span className="text-zinc-500 ml-2">
                    {formatNumber(totals.tokensSaved)} of{" "}
                    {formatNumber(totals.tokensTotal)}
                  </span>
                </div>
              </div>
              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.round((totals.tokensSaved / totals.tokensTotal) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />
                  Saved
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-sm bg-white/10" />
                  Used
                </span>
                <Link
                  href="/dashboard/analytics"
                  className="ml-auto hover:text-white flex items-center gap-1"
                >
                  Full analytics <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
