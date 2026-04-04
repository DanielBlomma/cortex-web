"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Shield,
  Key,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

type Policy = {
  ruleId: string;
  description: string;
  priority: number;
  enforce: boolean;
  createdAt: string;
};

type ApiKeyEntry = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

type ViolationByRule = {
  ruleId: string;
  count: number;
  errors: number;
  warnings: number;
};

type AuditEvent = {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  description: string;
  ipAddress: string | null;
  createdAt: string;
};

type ComplianceReport = {
  meta: {
    generatedAt: string;
    periodFrom: string;
    periodTo: string;
    framework: string[];
  };
  policyGovernance: {
    totalActivePolicies: number;
    enforcedPolicies: number;
    disabledPolicies: number;
    policies: Policy[];
  };
  accessControl: {
    totalActiveKeys: number;
    keysRevokedInPeriod: number;
    apiKeys: ApiKeyEntry[];
  };
  violations: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    byRule: ViolationByRule[];
  };
  auditTrail: {
    totalEvents: number;
    events: AuditEvent[];
  };
  telemetry: {
    totalSearches: number;
    totalTokensSaved: number;
    totalResultsReturned: number;
    telemetryPushes: number;
    activeInstances: number;
  };
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function defaultTo(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ReportsPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/reports/compliance?from=${from}&to=${to}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate report");
      }
      setReport(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const exportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${from}-to-${to}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (!report) return;
    const lines = ["Section,Key,Value"];
    lines.push(`Period,From,${report.meta.periodFrom}`);
    lines.push(`Period,To,${report.meta.periodTo}`);
    lines.push(`Period,Generated,${report.meta.generatedAt}`);
    lines.push(
      `Policies,Active,${report.policyGovernance.totalActivePolicies}`
    );
    lines.push(`Policies,Enforced,${report.policyGovernance.enforcedPolicies}`);
    lines.push(`Policies,Disabled,${report.policyGovernance.disabledPolicies}`);
    lines.push(`Access,Active API Keys,${report.accessControl.totalActiveKeys}`);
    lines.push(
      `Access,Keys Revoked in Period,${report.accessControl.keysRevokedInPeriod}`
    );
    lines.push(`Violations,Total,${report.violations.total}`);
    lines.push(`Violations,Errors,${report.violations.errors}`);
    lines.push(`Violations,Warnings,${report.violations.warnings}`);
    lines.push(`Violations,Info,${report.violations.info}`);
    lines.push(`Telemetry,Searches,${report.telemetry.totalSearches}`);
    lines.push(`Telemetry,Tokens Saved,${report.telemetry.totalTokensSaved}`);
    lines.push(
      `Telemetry,Active Instances,${report.telemetry.activeInstances}`
    );
    lines.push(`Audit,Total Events,${report.auditTrail.totalEvents}`);

    lines.push("");
    lines.push("Rule ID,Violations,Errors,Warnings");
    for (const r of report.violations.byRule) {
      lines.push(`${r.ruleId},${r.count},${r.errors},${r.warnings}`);
    }

    lines.push("");
    lines.push("Timestamp,Action,Resource,Description,IP,User");
    for (const e of report.auditTrail.events) {
      lines.push(
        `${e.createdAt},${e.action},${e.resourceType},"${e.description}",${e.ipAddress ?? ""},${e.userId ?? ""}`
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Compliance Reports</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Generate audit reports for ISO 27001 and SOC 2 reviews.
        </p>
      </div>

      <Card className="bg-white/[0.02] border-white/5">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-zinc-300">From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-black/30 border-white/10 mt-1 w-44"
              />
            </div>
            <div>
              <Label className="text-zinc-300">To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-black/30 border-white/10 mt-1 w-44"
              />
            </div>
            <Button onClick={generate} disabled={loading}>
              <FileText className="h-4 w-4 mr-2" />
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Header + Export */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {report.meta.framework.map((f) => (
                <Badge key={f} variant="outline" className="text-xs">
                  {f}
                </Badge>
              ))}
              <span className="text-xs text-zinc-500">
                {report.meta.periodFrom} — {report.meta.periodTo}
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportJson}>
                <Download className="h-3.5 w-3.5 mr-1" />
                JSON
              </Button>
              <Button size="sm" variant="outline" onClick={exportCsv}>
                <Download className="h-3.5 w-3.5 mr-1" />
                CSV
              </Button>
            </div>
          </div>

          {/* A.5 / CC1 — Policy Governance */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                Policy Governance
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  ISO 27001 A.5 / SOC 2 CC1
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Active Policies</p>
                  <p className="text-2xl font-bold text-white">
                    {report.policyGovernance.totalActivePolicies}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Enforced</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {report.policyGovernance.enforcedPolicies}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Disabled</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {report.policyGovernance.disabledPolicies}
                  </p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    <TableHead className="text-zinc-400">Rule</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Priority</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.policyGovernance.policies.map((p) => (
                    <TableRow key={p.ruleId} className="border-white/5">
                      <TableCell className="text-white text-sm font-mono">
                        {p.ruleId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${p.enforce ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10" : "text-zinc-400 border-white/10"}`}
                        >
                          {p.enforce ? "Enforced" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {p.priority}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm text-right">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* A.9 / CC6 — Access Control */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-violet-400" />
                Access Control
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  ISO 27001 A.9 / SOC 2 CC6
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Active API Keys</p>
                  <p className="text-2xl font-bold text-white">
                    {report.accessControl.totalActiveKeys}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">
                    Revoked During Period
                  </p>
                  <p className="text-2xl font-bold text-red-400">
                    {report.accessControl.keysRevokedInPeriod}
                  </p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    <TableHead className="text-zinc-400">Key</TableHead>
                    <TableHead className="text-zinc-400">Scopes</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Last Used
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.accessControl.apiKeys.map((k) => (
                    <TableRow key={k.id} className="border-white/5">
                      <TableCell className="text-white text-sm">
                        {k.name}{" "}
                        <span className="text-zinc-500 font-mono text-xs">
                          {k.prefix}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {k.scopes.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${k.status === "active" ? "text-emerald-400 border-emerald-400/20" : "text-red-400 border-red-400/20"}`}
                        >
                          {k.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm text-right">
                        {k.lastUsedAt
                          ? new Date(k.lastUsedAt).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* A.12.4 / CC7 — Violations */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Policy Violations
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  ISO 27001 A.12.4 / SOC 2 CC7
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Total</p>
                  <p className="text-2xl font-bold text-white">
                    {report.violations.total}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Errors</p>
                  <p className="text-2xl font-bold text-red-400">
                    {report.violations.errors}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Warnings</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {report.violations.warnings}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Info</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {report.violations.info}
                  </p>
                </div>
              </div>
              {report.violations.byRule.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead className="text-zinc-400">Rule</TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Count
                      </TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Errors
                      </TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Warnings
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.violations.byRule.map((r) => (
                      <TableRow key={r.ruleId} className="border-white/5">
                        <TableCell className="text-white text-sm font-mono">
                          {r.ruleId}
                        </TableCell>
                        <TableCell className="text-zinc-300 text-sm text-right">
                          {r.count}
                        </TableCell>
                        <TableCell className="text-red-400 text-sm text-right">
                          {r.errors || "—"}
                        </TableCell>
                        <TableCell className="text-amber-400 text-sm text-right">
                          {r.warnings || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-zinc-400" />
                Audit Trail
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  ISO 27001 A.12.4.1 / SOC 2 CC7.2
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.auditTrail.events.length === 0 ? (
                <p className="text-zinc-500 text-sm">
                  No audit events recorded in this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead className="text-zinc-400">
                        Timestamp
                      </TableHead>
                      <TableHead className="text-zinc-400">Action</TableHead>
                      <TableHead className="text-zinc-400">
                        Resource
                      </TableHead>
                      <TableHead className="text-zinc-400">
                        Description
                      </TableHead>
                      <TableHead className="text-zinc-400">IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.auditTrail.events.map((e) => (
                      <TableRow key={e.id} className="border-white/5">
                        <TableCell className="text-zinc-400 text-sm whitespace-nowrap">
                          {new Date(e.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {e.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          {e.resourceType}
                        </TableCell>
                        <TableCell className="text-zinc-300 text-sm max-w-xs truncate">
                          {e.description}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-sm font-mono">
                          {e.ipAddress || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* System Usage */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base">
                System Usage (Period)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Searches", value: report.telemetry.totalSearches },
                  {
                    label: "Tokens Saved",
                    value: report.telemetry.totalTokensSaved,
                  },
                  {
                    label: "Results",
                    value: report.telemetry.totalResultsReturned,
                  },
                  {
                    label: "Pushes",
                    value: report.telemetry.telemetryPushes,
                  },
                  {
                    label: "Instances",
                    value: report.telemetry.activeInstances,
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xs text-zinc-500">{s.label}</p>
                    <p className="text-xl font-bold text-white">
                      {formatNumber(s.value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
