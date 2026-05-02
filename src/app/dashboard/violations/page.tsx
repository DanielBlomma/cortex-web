"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardInfoButton } from "@/components/dashboard/dashboard-info-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dashboardHelp } from "@/lib/dashboard/help-content";
import { AlertTriangle, ShieldAlert, Info, FileWarning } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/dates";

type SeverityCounts = { error: number; warning: number; info: number };

type RuleBreakdown = {
  ruleId: string;
  count: number;
  errors: number;
  warnings: number;
  lastSeen: string;
};

type DailyRow = {
  date: string;
  total: number;
  errors: number;
  warnings: number;
};

type Violation = {
  id: string;
  repo: string | null;
  ruleId: string;
  severity: string;
  message: string;
  filePath: string | null;
  occurredAt: string;
};

type RepoBreakdown = {
  repo: string;
  total: number;
  errors: number;
  warnings: number;
  info: number;
  lastSeen: string;
};

type ViolationSummary = {
  severity: SeverityCounts;
  total: number;
  byRule: RuleBreakdown[];
  byRepo: RepoBreakdown[];
  daily: DailyRow[];
  recent: Violation[];
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const severityConfig: Record<
  string,
  { color: string; bg: string; border: string; icon: typeof AlertTriangle }
> = {
  error: {
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    icon: ShieldAlert,
  },
  warning: {
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    icon: AlertTriangle,
  },
  info: {
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    icon: Info,
  },
};

const VIOLATION_COMPLIANCE_SIGNALS = [
  "ISO 27001: proof that monitoring controls are detecting policy breaches",
  "ISO 42001: operational monitoring of AI-assisted work and human oversight feedback",
  "GDPR: evidence that risky handling patterns can be detected and investigated",
  "NIS2: warning/error trends support incident detection, escalation, and remediation follow-up",
] as const;

const VIOLATION_SHARED_RESPONSIBILITY = [
  "Violations show control activity and friction; they do not by themselves prove that every obligation is fully met.",
  "Interpret them together with policies, audit trail, reviews, and workflow evidence on the Compliance page.",
] as const;

export default function ViolationsPage() {
  const [data, setData] = useState<ViolationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/violations/summary");
      if (!res.ok) throw new Error("Failed to load violations");
      setData(await res.json());
    } catch {
      setError("Failed to load violation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchData();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [fetchData]);

  const daily = data?.daily ?? [];
  const repos = data?.byRepo ?? [];
  const warnedRepos = repos.filter((repo) => repo.warnings > 0);
  const latestWarnedRepo =
    warnedRepos.length > 0
      ? [...warnedRepos].sort(
          (a, b) =>
            new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
        )[0]
      : null;
  const maxDaily = Math.max(...daily.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Policy Violations</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Policy rule violations reported by cortex-enterprise instances.
          </p>
        </div>
        <DashboardInfoButton
          content={dashboardHelp.violationsPage}
          variant="pill"
          label="Page guide"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading violations...</p>
      ) : !data || data.total === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
          <FileWarning className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500">
            No violations recorded yet. Violations are reported when
            cortex-enterprise detects policy rule breaches.
          </p>
        </div>
      ) : (
        <>
          {/* Severity cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["error", "warning", "info"] as const).map((sev) => {
              const config = severityConfig[sev];
              const count = data.severity[sev];
              const Icon = config.icon;
              return (
                <Card key={sev} className="bg-white/[0.02] border-white/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">
                          {sev}s
                        </p>
                        <p className={`text-3xl font-bold ${config.color} mt-1`}>
                          {formatNumber(count)}
                        </p>
                      </div>
                      <div
                        className={`h-10 w-10 rounded-lg ${config.bg} ${config.border} border flex items-center justify-center`}
                      >
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                    </div>
                    {data.total > 0 && (
                      <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${config.bg.replace("/10", "/40")}`}
                          style={{
                            width: `${Math.round((count / data.total) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-amber-400/20 bg-amber-400/5">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Compliance Relevance
                <DashboardInfoButton
                  content={dashboardHelp.complianceViolations}
                  className="ml-2 inline-flex"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-300">
                Policy Violations make it visible that controls are active, triggering,
                and leaving evidence behind. That matters for GDPR, NIS2, ISO 27001,
                and ISO 42001 because reviewers need to see not only defined rules,
                but also that the rules actually detect behavior in live workflows.
              </p>
              <div className="flex flex-wrap gap-2">
                {VIOLATION_COMPLIANCE_SIGNALS.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="text-xs text-amber-200 border-amber-400/20 bg-amber-400/10"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
              <div className="space-y-1">
                {VIOLATION_SHARED_RESPONSIBILITY.map((item) => (
                  <p key={item} className="text-xs text-zinc-400">
                    {item}
                  </p>
                ))}
              </div>
              <a
                href="/dashboard/reports"
                className="inline-flex items-center rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition-colors hover:border-white/20 hover:bg-black/30"
              >
                Open Compliance Report
              </a>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Repos With Warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {warnedRepos.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No warning-level violations are tied to a repo yet.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {warnedRepos.length} repo
                      {warnedRepos.length !== 1 ? "s" : ""} warned
                    </Badge>
                    {latestWarnedRepo && (
                      <Badge variant="secondary" className="text-xs">
                        Latest warned repo: {latestWarnedRepo.repo}
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {warnedRepos.slice(0, 9).map((repo) => (
                      <div
                        key={repo.repo}
                        className="rounded-xl border border-white/5 bg-black/20 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm text-white">
                              {repo.repo}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatDateTime(repo.lastSeen)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-amber-400/20 bg-amber-400/10 text-amber-300"
                          >
                            {repo.warnings} warning
                            {repo.warnings !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
                          <span>{repo.total} total</span>
                          <span>{repo.errors} errors</span>
                          <span>{repo.info} info</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily violations chart */}
          {daily.length > 0 && (
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Daily Violations — Last {daily.length} Days
                  <DashboardInfoButton content={dashboardHelp.violationsDaily} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative flex gap-[3px] h-36">
                  {daily.map((d) => {
                    const barHeight = Math.max(
                      (d.total / maxDaily) * 100,
                      2
                    );
                    const errorPct =
                      d.total > 0 ? (d.errors / d.total) * 100 : 0;
                    const warningPct =
                      d.total > 0 ? (d.warnings / d.total) * 100 : 0;
                    const infoPct = 100 - errorPct - warningPct;

                    return (
                      <div
                        key={d.date}
                        className="group relative flex-1 h-full flex flex-col justify-end"
                      >
                        <div
                          className="w-full rounded-sm overflow-hidden flex flex-col"
                          style={{ height: `${barHeight}%` }}
                        >
                          <div
                            className="w-full bg-red-400/50"
                            style={{ height: `${errorPct}%` }}
                          />
                          <div
                            className="w-full bg-amber-400/40"
                            style={{ height: `${warningPct}%` }}
                          />
                          <div
                            className="w-full bg-blue-400/20"
                            style={{ height: `${infoPct}%` }}
                          />
                        </div>
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 pointer-events-none">
                          <div className="bg-zinc-800 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white whitespace-nowrap space-y-0.5 shadow-lg">
                            <p className="font-medium">{d.date}</p>
                            <p className="text-red-400">{d.errors} errors</p>
                            <p className="text-amber-400">
                              {d.warnings} warnings
                            </p>
                            <p className="text-zinc-400">{d.total} total</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-zinc-600">
                  <span>{daily[0]?.date}</span>
                  <span>{daily[daily.length - 1]?.date}</span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/50" />
                    Errors
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400/40" />
                    Warnings
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400/20" />
                    Info
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top violated rules */}
          {data.byRule.length > 0 && (
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <CardTitle className="text-white text-base">
                  Violations by Rule
                  <DashboardInfoButton
                    content={dashboardHelp.violationsByRule}
                    className="ml-2 inline-flex"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead className="text-zinc-400">Rule</TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Total
                      </TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Errors
                      </TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Warnings
                      </TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Last Seen
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byRule.map((r) => (
                      <TableRow key={r.ruleId} className="border-white/5">
                        <TableCell className="font-mono text-white text-sm">
                          {r.ruleId}
                        </TableCell>
                        <TableCell className="text-zinc-300 text-sm text-right">
                          {formatNumber(r.count)}
                        </TableCell>
                        <TableCell className="text-red-400 text-sm text-right">
                          {r.errors > 0 ? formatNumber(r.errors) : "—"}
                        </TableCell>
                        <TableCell className="text-amber-400 text-sm text-right">
                          {r.warnings > 0 ? formatNumber(r.warnings) : "—"}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-sm text-right">
                          {formatDate(r.lastSeen)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Recent violations */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Recent Violations
                <DashboardInfoButton
                  content={dashboardHelp.violationsRecent}
                  className="ml-2 inline-flex"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    <TableHead className="text-zinc-400">Severity</TableHead>
                    <TableHead className="text-zinc-400">Repo</TableHead>
                    <TableHead className="text-zinc-400">Rule</TableHead>
                    <TableHead className="text-zinc-400">Message</TableHead>
                    <TableHead className="text-zinc-400">File</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      When
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent.map((v) => {
                    const config = severityConfig[v.severity] ?? severityConfig.info;
                    return (
                      <TableRow key={v.id} className="border-white/5">
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${config.color} ${config.border} ${config.bg}`}
                          >
                            {v.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm font-mono text-zinc-300">
                          {v.repo ? (
                            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-amber-300">
                              {v.repo}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-white text-sm">
                          {v.ruleId}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm max-w-xs truncate">
                          {v.message || "—"}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-sm font-mono max-w-[200px] truncate">
                          {v.filePath || "—"}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-sm text-right whitespace-nowrap">
                          {formatDateTime(v.occurredAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
