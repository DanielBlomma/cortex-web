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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Totals = {
  searches: number;
  tokensSaved: number;
  tokensTotal: number;
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
  activePolicies: number;
  versions: VersionInfo[];
  daily: { date: string; searches: number }[];
};

type ViolationSummary = {
  severity: { error: number; warning: number; info: number };
  total: number;
  recent: {
    id: string;
    ruleId: string;
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
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

type Policy = {
  id: string;
  ruleId: string;
  description: string;
  enforce: boolean;
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

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const [violations, setViolations] = useState<ViolationSummary | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [telRes, violRes, keysRes, polRes] = await Promise.allSettled([
      fetch("/api/v1/telemetry/summary").then((r) => r.json()),
      fetch("/api/v1/violations/summary").then((r) => r.json()),
      fetch("/api/v1/api-keys").then((r) => r.json()),
      fetch("/api/v1/policies").then((r) => r.json()),
    ]);

    if (telRes.status === "fulfilled") setTelemetry(telRes.value);
    if (violRes.status === "fulfilled") setViolations(violRes.value);
    if (keysRes.status === "fulfilled") setKeys(keysRes.value.keys ?? []);
    if (polRes.status === "fulfilled") setPolicies(polRes.value.policies ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const totals = telemetry?.totals;
  const hasData = totals && totals.eventCount > 0;

  const daily = telemetry?.daily ?? [];
  const maxSearches = Math.max(...daily.map((d) => Number(d.searches)), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Your organization&apos;s Cortex status at a glance.
        </p>
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
              Tokens Saved
            </CardTitle>
            <Zap className="h-4 w-4 text-emerald-500/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {loading
                ? "..."
                : hasData
                  ? formatNumber(totals.tokensSaved)
                  : "—"}
            </div>
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
                    2
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
              <p className="text-sm text-zinc-600">
                No telemetry data yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Violations summary */}
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Violations
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
                    className="flex items-center gap-2 text-xs"
                  >
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
                    <span className="text-zinc-400 font-mono truncate">
                      {v.ruleId}
                    </span>
                    {v.repo && (
                      <span className="text-zinc-600 ml-auto truncate max-w-[120px]">
                        {v.repo}
                      </span>
                    )}
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
            {telemetry?.versions && telemetry.versions.length > 0 ? (
              <div className="space-y-3">
                {telemetry.versions.map((v) => (
                  <div
                    key={v.version}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-white">
                        {v.version}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {v.instances} {v.instances === 1 ? "instance" : "instances"}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-600">
                      {timeAgo(v.lastSeen)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">
                No version data yet. Enterprise instances report their version
                via telemetry.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active API Keys */}
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-zinc-400" />
              API Keys
              <span className="text-zinc-500 text-sm font-normal">
                ({keys.length})
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
                {keys.slice(0, 4).map((k) => (
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
                {keys.length > 4 && (
                  <p className="text-xs text-zinc-600">
                    +{keys.length - 4} more
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
              <span className="text-zinc-500 text-sm font-normal">
                ({policies.length})
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
                {policies.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-white font-mono text-xs truncate">
                      {p.ruleId}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        p.enforce
                          ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                          : "text-zinc-500 border-white/5 bg-white/5"
                      }
                    >
                      {p.enforce ? "enforced" : "disabled"}
                    </Badge>
                  </div>
                ))}
                {policies.length > 5 && (
                  <p className="text-xs text-zinc-600">
                    +{policies.length - 5} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No policies configured.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token savings bar */}
      {hasData && totals.tokensSaved > 0 && totals.tokensTotal > 0 && (
        <Card className="bg-white/[0.02] border-white/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">
                  Token Savings
                </span>
              </div>
              <div className="text-right text-sm">
                <span className="text-emerald-400 font-bold">
                  {Math.round(
                    (totals.tokensSaved / totals.tokensTotal) * 100
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
