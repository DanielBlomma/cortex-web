"use client";

import { useState, useEffect, useCallback } from "react";
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
import { AlertTriangle, ShieldAlert, Info, FileWarning } from "lucide-react";

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

type ViolationSummary = {
  severity: SeverityCounts;
  total: number;
  byRule: RuleBreakdown[];
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
    void fetchData();
  }, [fetchData]);

  const daily = data?.daily ?? [];
  const maxDaily = Math.max(...daily.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Violations</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Policy rule violations reported by cortex-enterprise instances.
        </p>
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

          {/* Daily violations chart */}
          {daily.length > 0 && (
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Daily Violations — Last {daily.length} Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-[3px] h-36">
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
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                          <div className="bg-zinc-800 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white whitespace-nowrap space-y-0.5">
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
                          {new Date(r.lastSeen).toLocaleDateString()}
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
                        <TableCell className="text-zinc-300 text-sm font-mono max-w-[160px] truncate">
                          {v.repo || "—"}
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
                          {new Date(v.occurredAt).toLocaleString()}
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
