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
import { Search, Zap, FileText, RefreshCw } from "lucide-react";

type Totals = {
  toolCalls: number;
  successfulToolCalls: number;
  failedToolCalls: number;
  totalDurationMs: number;
  sessionStarts: number;
  sessionEnds: number;
  sessionDurationMsTotal: number;
  searches: number;
  relatedLookups: number;
  callerLookups: number;
  traceLookups: number;
  impactAnalyses: number;
  ruleLookups: number;
  reloads: number;
  resultsReturned: number;
  tokensSaved: number;
  tokensTotal: number;
  tokensReported: boolean;
  eventCount: number;
  activeInstances: number;
};

type DailyRow = {
  date: string;
  toolCalls: number;
  successfulToolCalls: number;
  failedToolCalls: number;
  totalDurationMs: number;
  searches: number;
  relatedLookups: number;
  ruleLookups: number;
  callerLookups: number;
  traceLookups: number;
  impactAnalyses: number;
  reloads: number;
  resultsReturned: number;
  tokensSaved: number;
  tokensTotal: number;
  tokensReported: boolean;
  pushCount: number;
};

type Governance = {
  includedData: string[];
  tokenMethodology: {
    preferredSource: string;
    fallback: string;
    caveat: string;
  };
  complianceSupport: {
    frameworks: string[];
    posture: string;
    sharedResponsibility: string[];
  };
};

type Boundary = {
  days: number;
  payload: string;
  excludes: string[];
};

type SummaryResponse = {
  boundary: Boundary;
  governance: Governance;
  lastTelemetryAt: string | null;
  totals: Totals;
  activePolicies: number;
  daily: DailyRow[];
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function savingsPercent(saved: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((saved / total) * 100)}%`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "No telemetry received yet";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AnalyticsPage() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/telemetry/summary");
      if (!res.ok) throw new Error("Failed to load telemetry");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load telemetry data");
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

  const totals = data?.totals;
  const daily = data?.daily ?? [];
  const boundary = data?.boundary;
  const governance = data?.governance;
  const hasData = totals && totals.eventCount > 0;
  const hasTokenTotals = totals && totals.tokensSaved > 0 && totals.tokensTotal > 0;
  const maxTokensTotal = Math.max(
    ...daily.map((d) => Number(d.tokensTotal)),
    1
  );

  const summaryCards = [
    { title: "Searches", value: totals?.searches ?? 0, icon: Search },
    { title: "Related Lookups", value: totals?.relatedLookups ?? 0, icon: FileText },
    { title: "Rule Lookups", value: totals?.ruleLookups ?? 0, icon: Search },
    { title: "Reloads", value: totals?.reloads ?? 0, icon: RefreshCw },
    { title: "Results Returned", value: totals?.resultsReturned ?? 0, icon: FileText },
    { title: "Tokens Saved", value: totals?.tokensSaved ?? 0, icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Telemetry data across all cloud-connected instances.
          </p>
        </div>
        <DashboardInfoButton
          content={dashboardHelp.analyticsPage}
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
        <p className="text-zinc-500 text-sm">Loading telemetry...</p>
      ) : !hasData ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">
            No telemetry data yet. Connect an instance to start seeing analytics.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {summaryCards.map((card) => (
              <Card key={card.title} className="bg-white/[0.02] border-white/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-500">
                    {card.title}
                  </CardTitle>
                  <card.icon className="h-3.5 w-3.5 text-zinc-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-white">
                    {formatNumber(card.value)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {totals.eventCount} telemetry pushes
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {totals.activeInstances} instance
              {totals.activeInstances !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Last received {formatDateTime(data?.lastTelemetryAt ?? null)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {totals.tokensReported
                ? "Token totals reported by client"
                : "Token totals estimated by Cortex"}
            </Badge>
          </div>

          {boundary && governance && (
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <CardTitle className="text-white text-base">
                  Telemetry Boundary & Compliance
                  <DashboardInfoButton
                    content={dashboardHelp.analyticsBoundary}
                    className="ml-2 inline-flex"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Counts and metadata only
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Telemetry is retained for {boundary.days} days and is intended
                      for operational analytics, monitoring, and audit-supporting
                      evidence rather than raw content inspection.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Included
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {governance.includedData.map((item) => (
                        <Badge key={item} variant="outline" className="text-xs text-zinc-300">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Explicitly excluded
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {boundary.excludes.map((item) => (
                        <Badge key={item} variant="outline" className="text-xs text-zinc-400">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-white">Token accounting</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {governance.tokenMethodology.preferredSource}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {governance.tokenMethodology.fallback}
                    </p>
                    <p className="mt-2 text-xs text-amber-300/80">
                      {governance.tokenMethodology.caveat}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white">
                      Compliance support
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {governance.complianceSupport.posture}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {governance.complianceSupport.frameworks.map((framework) => (
                        <Badge key={framework} variant="outline" className="text-xs text-zinc-300">
                          {framework}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 space-y-2">
                      {governance.complianceSupport.sharedResponsibility.map((item) => (
                        <p key={item} className="text-xs text-zinc-500">
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Token savings comparison */}
          {hasTokenTotals && (
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  Token Savings
                  <DashboardInfoButton
                    content={dashboardHelp.analyticsTokenSavings}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall gauge */}
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-emerald-400">
                        {savingsPercent(totals.tokensSaved, totals.tokensTotal)}
                      </p>
                      <p className="text-sm text-zinc-500">
                        of total tokens saved by Cortex
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-zinc-400">
                        <span className="text-emerald-400 font-medium">
                          {formatNumber(totals.tokensSaved)}
                        </span>{" "}
                        saved
                      </p>
                      <p className="text-zinc-500">
                        {formatNumber(totals.tokensTotal - totals.tokensSaved)}{" "}
                        used &middot; {formatNumber(totals.tokensTotal)} total
                      </p>
                    </div>
                  </div>
                  <div className="h-4 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                      style={{
                        width: `${Math.round((totals.tokensSaved / totals.tokensTotal) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                      Saved
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-white/10" />
                      Used
                    </span>
                    <span>
                      {totals.tokensReported
                        ? "Client-reported total tokens"
                        : "Cortex-estimated total tokens"}
                    </span>
                  </div>
                </div>

                {/* Daily stacked bars */}
                <div>
                  <p className="text-sm text-zinc-400 mb-3">
                    Daily — Saved vs Used
                  </p>
                  <div className="flex gap-[3px] h-36">
                    {daily.map((d) => {
                      const total = Number(d.tokensTotal);
                      const saved = Number(d.tokensSaved);
                      const used = total - saved;
                      const barHeight = Math.max(
                        (total / maxTokensTotal) * 100,
                        2
                      );
                      const savedPct = total > 0 ? (saved / total) * 100 : 0;

                      return (
                        <div
                          key={d.date}
                          className="group relative flex-1 h-full flex flex-col justify-end"
                        >
                          <div
                            className="w-full rounded-sm overflow-hidden flex flex-col justify-end"
                            style={{ height: `${barHeight}%` }}
                          >
                            <div
                              className="w-full bg-white/10"
                              style={{ height: `${100 - savedPct}%` }}
                            />
                            <div
                              className="w-full bg-emerald-400/60"
                              style={{ height: `${savedPct}%` }}
                            />
                          </div>
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                            <div className="bg-zinc-800 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white whitespace-nowrap space-y-0.5">
                              <p className="font-medium">{d.date}</p>
                              <p className="text-emerald-400">
                                {formatNumber(saved)} saved (
                                {savingsPercent(saved, total)})
                              </p>
                              <p className="text-zinc-400">
                                {formatNumber(used)} used
                              </p>
                              <p className="text-zinc-500">
                                {formatNumber(total)} total
                              </p>
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily table */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Daily Breakdown
                <DashboardInfoButton
                  content={dashboardHelp.analyticsDailyBreakdown}
                  className="ml-2 inline-flex"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    <TableHead className="text-zinc-400">Date</TableHead>
                    <TableHead className="text-zinc-400 text-right">Searches</TableHead>
                    <TableHead className="text-zinc-400 text-right">Related</TableHead>
                    <TableHead className="text-zinc-400 text-right">Rules</TableHead>
                    <TableHead className="text-zinc-400 text-right">Reloads</TableHead>
                    <TableHead className="text-zinc-400 text-right">Results</TableHead>
                    <TableHead className="text-zinc-400 text-right">Tokens Saved</TableHead>
                    {hasTokenTotals && (
                      <TableHead className="text-zinc-400 text-right">Savings %</TableHead>
                    )}
                    <TableHead className="text-zinc-400 text-right">Pushes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...daily].reverse().map((d) => (
                    <TableRow key={d.date} className="border-white/5">
                      <TableCell className="text-white text-sm font-mono">
                        {d.date}
                      </TableCell>
                      <TableCell className="text-zinc-300 text-sm text-right">
                        {formatNumber(Number(d.searches))}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">
                        {formatNumber(Number(d.relatedLookups))}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">
                        {formatNumber(Number(d.ruleLookups))}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">
                        {Number(d.reloads)}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">
                        {formatNumber(Number(d.resultsReturned))}
                      </TableCell>
                      <TableCell className="text-zinc-300 text-sm text-right">
                        {formatNumber(Number(d.tokensSaved))}
                      </TableCell>
                      {hasTokenTotals && (
                        <TableCell className="text-emerald-400 text-sm text-right font-medium">
                          {savingsPercent(
                            Number(d.tokensSaved),
                            Number(d.tokensTotal)
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-zinc-500 text-sm text-right">
                        {Number(d.pushCount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
