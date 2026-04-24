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
import { formatDate, formatDateTime } from "@/lib/dates";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ClipboardCheck,
} from "lucide-react";

type PolicyBreakdown = {
  policyId: string;
  count: number;
  passed: number;
  failed: number;
  errors: number;
  lastSeen: string;
};

type DailyRow = {
  date: string;
  total: number;
  passed: number;
  failed: number;
};

type Review = {
  id: string;
  repo: string | null;
  policyId: string;
  pass: boolean;
  severity: string;
  message: string;
  detail: string | null;
  reviewedAt: string;
};

type ReviewSummary = {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  warnings: number;
  complianceScore: number | null;
  byPolicy: PolicyBreakdown[];
  daily: DailyRow[];
  recent: Review[];
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const severityConfig: Record<
  string,
  { color: string; bg: string; border: string }
> = {
  error: {
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  warning: {
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  info: {
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
};

export default function ReviewsPage() {
  const [data, setData] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/reviews/summary");
      if (!res.ok) throw new Error("Failed to load reviews");
      setData(await res.json());
    } catch {
      setError("Failed to load review data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const daily = data?.daily ?? [];
  const maxDaily = Math.max(...daily.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Policy Reviews</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Enterprise validator results from{" "}
            <code className="font-mono text-xs text-zinc-300">/review</code>{" "}
            runs.
          </p>
        </div>
        <DashboardInfoButton
          content={dashboardHelp.reviewsPage}
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
        <p className="text-zinc-500 text-sm">Loading reviews...</p>
      ) : !data || data.total === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
          <ClipboardCheck className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500">
            No policy reviews recorded yet. Run <code className="font-mono text-xs text-zinc-300">/review</code> in cortex-enterprise to check changes against enforced policies.
          </p>
        </div>
      ) : (
        <>
          {/* Top-level cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">
                      Compliance score
                    </p>
                    <p className="text-3xl font-bold text-emerald-400 mt-1">
                      {data.complianceScore !== null
                        ? `${data.complianceScore.toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-3">
                  {formatNumber(data.passed)} passed / {formatNumber(data.total)} total
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">
                      Passed
                    </p>
                    <p className="text-3xl font-bold text-emerald-400 mt-1">
                      {formatNumber(data.passed)}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">
                      Failed
                    </p>
                    <p className="text-3xl font-bold text-red-400 mt-1">
                      {formatNumber(data.failed)}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-3">
                  {data.errors} errors · {data.warnings} warnings
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily chart */}
          {daily.length > 0 && (
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Daily Reviews — Last {daily.length} Days
                  <DashboardInfoButton content={dashboardHelp.reviewsDaily} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative flex gap-[3px] h-36">
                  {daily.map((d) => {
                    const barHeight = Math.max(
                      (d.total / maxDaily) * 100,
                      2
                    );
                    const passPct =
                      d.total > 0 ? (d.passed / d.total) * 100 : 0;
                    const failPct = 100 - passPct;

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
                            style={{ height: `${failPct}%` }}
                          />
                          <div
                            className="w-full bg-emerald-400/40"
                            style={{ height: `${passPct}%` }}
                          />
                        </div>
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 pointer-events-none">
                          <div className="bg-zinc-800 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white whitespace-nowrap space-y-0.5 shadow-lg">
                            <p className="font-medium">{d.date}</p>
                            <p className="text-emerald-400">{d.passed} passed</p>
                            <p className="text-red-400">{d.failed} failed</p>
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
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400/40" />
                    Passed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/50" />
                    Failed
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* By policy */}
          {data.byPolicy.length > 0 && (
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <CardTitle className="text-white text-base">
                  Reviews by Policy
                  <DashboardInfoButton
                    content={dashboardHelp.reviewsByPolicy}
                    className="ml-2 inline-flex"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead className="text-zinc-400">Policy</TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Total
                      </TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Passed
                      </TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Failed
                      </TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Errors
                      </TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Last Seen
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byPolicy.map((p) => (
                      <TableRow key={p.policyId} className="border-white/5">
                        <TableCell className="font-mono text-white text-sm">
                          {p.policyId}
                        </TableCell>
                        <TableCell className="text-zinc-300 text-sm text-right">
                          {formatNumber(p.count)}
                        </TableCell>
                        <TableCell className="text-emerald-400 text-sm text-right">
                          {p.passed > 0 ? formatNumber(p.passed) : "—"}
                        </TableCell>
                        <TableCell className="text-red-400 text-sm text-right">
                          {p.failed > 0 ? formatNumber(p.failed) : "—"}
                        </TableCell>
                        <TableCell className="text-red-400 text-sm text-right">
                          {p.errors > 0 ? formatNumber(p.errors) : "—"}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-sm text-right">
                          {formatDate(p.lastSeen)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Recent reviews */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Recent Reviews
                <DashboardInfoButton
                  content={dashboardHelp.reviewsRecent}
                  className="ml-2 inline-flex"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Repo</TableHead>
                    <TableHead className="text-zinc-400">Policy</TableHead>
                    <TableHead className="text-zinc-400">Message</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      When
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent.map((r) => {
                    const config =
                      severityConfig[r.severity] ?? severityConfig.info;
                    return (
                      <TableRow key={r.id} className="border-white/5">
                        <TableCell>
                          {r.pass ? (
                            <Badge
                              variant="outline"
                              className="text-xs text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                            >
                              pass
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`text-xs ${config.color} ${config.border} ${config.bg}`}
                            >
                              {r.severity}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-300 text-sm font-mono max-w-[160px] truncate">
                          {r.repo || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-white text-sm">
                          {r.policyId}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm max-w-xs truncate">
                          {r.message || "—"}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-sm text-right whitespace-nowrap">
                          {formatDateTime(r.reviewedAt)}
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
