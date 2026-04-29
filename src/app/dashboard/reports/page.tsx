"use client";

import { useState } from "react";
import { DashboardInfoButton } from "@/components/dashboard/dashboard-info-button";
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
  CheckCircle2,
  Gauge,
  GitBranch,
  Hourglass,
} from "lucide-react";
import { dashboardHelp } from "@/lib/dashboard/help-content";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { Policy as DashboardPolicy } from "@/lib/types/policy";

type Policy = {
  id: string;
  title: string;
  ruleId: string;
  kind: DashboardPolicy["kind"];
  status: DashboardPolicy["status"];
  severity: DashboardPolicy["severity"];
  description: string;
  priority: number;
  enforce: boolean;
  scope: string;
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
  ruleTitle: string;
  policySeverity: DashboardPolicy["severity"] | null;
  count: number;
  errors: number;
  warnings: number;
};

type AuditEvent = {
  id: string;
  userId: string | null;
  action: string;
  source?: string | null;
  eventType?: string | null;
  evidenceLevel?: string | null;
  resourceType: string;
  description: string;
  repo?: string | null;
  sessionId?: string | null;
  occurredAt?: string;
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
    retention?: {
      requiredDays: number;
      diagnosticDays: number;
    };
    events: AuditEvent[];
  };
  reviewEvidence: {
    total: number;
    passed: number;
    failed: number;
    blockingFailures: number;
    warnings: number;
    passRate: number | null;
  };
  workflowEvidence: {
    totalSnapshots: number;
    approvedSnapshots: number;
    readySnapshots: number;
    blockedSnapshots: number;
    recent: Array<{
      repo: string | null;
      sessionId: string | null;
      phase: string;
      approvalStatus: string;
      planStatus: string;
      reviewStatus: string;
      receivedAt: string;
    }>;
  };
  telemetry: {
    retention?: {
      days: number;
      payload: string;
      excludes: string[];
    };
    totalToolCalls: number;
    successfulToolCalls: number;
    failedToolCalls: number;
    totalDurationMs: number;
    sessionStarts: number;
    sessionEnds: number;
    totalSearches: number;
    totalTokensSaved: number;
    totalResultsReturned: number;
    telemetryPushes: number;
    activeInstances: number;
  };
  controlMapping: {
    summary: {
      covered: number;
      partial: number;
      manual: number;
      total: number;
    };
    controls: Array<{
      id: string;
      title: string;
      capability: string;
      status: "covered" | "partial" | "manual";
      rationale: string;
      evidenceSignals: string[];
      mappings: Array<{
        framework: string;
        area: string;
      }>;
      customerResponsibilities: string[];
    }>;
  };
  regulatoryPackPreview: Array<{
    pack: string;
    evidenceLevel: "preview";
    policyCount: number;
    enforcedPolicyCount: number;
    recentViolationCount: number;
    controlAreas: string[];
    policies: Array<{
      id: string;
      ruleId: string;
      title: string;
      enforce: boolean;
      status: string;
      severity: string;
    }>;
  }>;
  residualResponsibilities: string[];
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

const policyStatusBadgeClass: Record<DashboardPolicy["status"], string> = {
  active: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
  draft: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  disabled: "text-zinc-400 border-white/10 bg-black/20",
  archived: "text-zinc-500 border-white/10 bg-black/30",
};

const policySeverityBadgeClass: Record<DashboardPolicy["severity"], string> = {
  block: "text-red-400 border-red-400/20 bg-red-400/10",
  error: "text-orange-400 border-orange-400/20 bg-orange-400/10",
  warning: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  info: "text-sky-300 border-sky-400/20 bg-sky-400/10",
};

const controlStatusBadgeClass = {
  covered: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
  partial: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  manual: "text-zinc-400 border-white/10 bg-black/20",
} as const;

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
    // RFC 4180 cell quoting — wrap in double-quotes and double-up any embedded ones.
    // Required even for taxonomy strings, since future control-area or framework
    // names may legitimately contain commas, quotes, or newlines.
    const csvCell = (value: unknown): string => {
      const s = value === null || value === undefined ? "" : String(value);
      return `"${s.replace(/"/g, '""')}"`;
    };
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
    lines.push(`Reviews,Total,${report.reviewEvidence.total}`);
    lines.push(`Reviews,Passed,${report.reviewEvidence.passed}`);
    lines.push(`Reviews,Failed,${report.reviewEvidence.failed}`);
    lines.push(`Workflow,Snapshots,${report.workflowEvidence.totalSnapshots}`);
    lines.push(`Workflow,Approved,${report.workflowEvidence.approvedSnapshots}`);
    lines.push(
      `Controls,Covered,${report.controlMapping.summary.covered}`
    );
    lines.push(
      `Controls,Partial,${report.controlMapping.summary.partial}`
    );
    lines.push(`Controls,Manual,${report.controlMapping.summary.manual}`);
    lines.push(`Telemetry,Tool Calls,${report.telemetry.totalToolCalls}`);
    lines.push(
      `Telemetry,Successful Tool Calls,${report.telemetry.successfulToolCalls}`
    );
    lines.push(
      `Telemetry,Failed Tool Calls,${report.telemetry.failedToolCalls}`
    );
    lines.push(`Telemetry,Session Starts,${report.telemetry.sessionStarts}`);
    lines.push(`Telemetry,Session Ends,${report.telemetry.sessionEnds}`);
    lines.push(
      `Telemetry,Total Duration Ms,${report.telemetry.totalDurationMs}`
    );

    lines.push("");
    lines.push("Control ID,Title,Status,Capability,Rationale,Mappings,Evidence Signals");
    for (const control of report.controlMapping.controls) {
      lines.push(
        [
          csvCell(control.id),
          csvCell(control.title),
          csvCell(control.status),
          csvCell(control.capability),
          csvCell(control.rationale),
          csvCell(
            control.mappings
              .map((mapping) => `${mapping.framework}: ${mapping.area}`)
              .join(" | ")
          ),
          csvCell(control.evidenceSignals.join(" | ")),
        ].join(",")
      );
    }

    lines.push("");
    lines.push("Residual Responsibility");
    for (const responsibility of report.residualResponsibilities) {
      lines.push(csvCell(responsibility));
    }

    lines.push("");
    lines.push(
      "Planned EU Regulatory Packs (preview only — not a supported framework claim)"
    );
    lines.push(
      "Pack,Evidence Level,Policy Count,Enforced Count,Recent Violations,Control Areas"
    );
    for (const entry of report.regulatoryPackPreview) {
      lines.push(
        [
          csvCell(entry.pack),
          csvCell(entry.evidenceLevel),
          csvCell(entry.policyCount),
          csvCell(entry.enforcedPolicyCount),
          csvCell(entry.recentViolationCount),
          csvCell(entry.controlAreas.join(" | ")),
        ].join(",")
      );
    }
    lines.push("");
    lines.push("Pack,Policy Title,Rule ID,Status,Severity,Mode");
    for (const entry of report.regulatoryPackPreview) {
      for (const policy of entry.policies) {
        lines.push(
          [
            csvCell(entry.pack),
            csvCell(policy.title),
            csvCell(policy.ruleId),
            csvCell(policy.status),
            csvCell(policy.severity),
            csvCell(policy.enforce ? "enforced" : "advisory"),
          ].join(",")
        );
      }
    }

    lines.push("");
    lines.push("Policy Title,Rule ID,Kind,Status,Severity,Mode,Priority,Scope");
    for (const p of report.policyGovernance.policies) {
      lines.push(
        [
          csvCell(p.title),
          csvCell(p.ruleId),
          csvCell(p.kind),
          csvCell(p.status),
          csvCell(p.severity),
          csvCell(p.enforce ? "blocking" : "advisory"),
          csvCell(p.priority),
          csvCell(p.scope),
        ].join(",")
      );
    }

    lines.push("");
    lines.push("Rule Title,Rule ID,Policy Severity,Violations,Errors,Warnings");
    for (const r of report.violations.byRule) {
      lines.push(
        [
          csvCell(r.ruleTitle),
          csvCell(r.ruleId),
          csvCell(r.policySeverity ?? ""),
          csvCell(r.count),
          csvCell(r.errors),
          csvCell(r.warnings),
        ].join(",")
      );
    }

    lines.push("");
    lines.push("Occurred,Source,Event Type,Evidence,Action,Resource,Description,Repo,Session,IP,User");
    for (const e of report.auditTrail.events) {
      lines.push(
        [
          csvCell(e.occurredAt ?? e.createdAt),
          csvCell(e.source ?? ""),
          csvCell(e.eventType ?? ""),
          csvCell(e.evidenceLevel ?? ""),
          csvCell(e.action),
          csvCell(e.resourceType),
          csvCell(e.description),
          csvCell(e.repo ?? ""),
          csvCell(e.sessionId ?? ""),
          csvCell(e.ipAddress ?? ""),
          csvCell(e.userId ?? ""),
        ].join(",")
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Reports</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Generate evidence-backed control reports for ISO 27001, ISO 42001,
            and SOC 2.
          </p>
        </div>
        <DashboardInfoButton
          content={dashboardHelp.compliancePage}
          variant="pill"
          label="Page guide"
        />
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

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Control Coverage
                <DashboardInfoButton
                  content={dashboardHelp.complianceControlCoverage}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Covered</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {report.controlMapping.summary.covered}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Partial</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {report.controlMapping.summary.partial}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Manual</p>
                  <p className="text-2xl font-bold text-zinc-300">
                    {report.controlMapping.summary.manual}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Total Controls</p>
                  <p className="text-2xl font-bold text-white">
                    {report.controlMapping.summary.total}
                  </p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    <TableHead className="text-zinc-400">Control</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Framework Mapping</TableHead>
                    <TableHead className="text-zinc-400">Evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.controlMapping.controls.map((control) => (
                    <TableRow key={control.id} className="border-white/5 align-top">
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          <div className="text-white">
                            {control.title}
                          </div>
                          <div className="font-mono text-xs text-zinc-500">
                            {control.id}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {control.capability}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${controlStatusBadgeClass[control.status]}`}
                          >
                            {control.status}
                          </Badge>
                          <p className="text-xs text-zinc-500">
                            {control.rationale}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400">
                        <div className="space-y-1">
                          {control.mappings.map((mapping) => (
                            <div key={`${control.id}-${mapping.framework}`}>
                              <span className="text-zinc-200">{mapping.framework}</span>:{" "}
                              {mapping.area}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400">
                        <div className="space-y-1">
                          {control.evidenceSignals.length > 0 ? (
                            control.evidenceSignals.map((signal) => (
                              <div key={`${control.id}-${signal}`}>{signal}</div>
                            ))
                          ) : (
                            <div>No direct evidence in selected period</div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Planned EU Regulatory Packs — preview only */}
          {report.regulatoryPackPreview.some((p) => p.policyCount > 0) && (
            <Card className="bg-white/[0.02] border-amber-400/20">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Hourglass className="h-4 w-4 text-amber-400" />
                  Planned EU Regulatory Packs
                  <Badge
                    variant="outline"
                    className="text-[10px] ml-auto text-amber-300 border-amber-400/20 bg-amber-400/10"
                  >
                    Preview
                  </Badge>
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-2">
                  Evidence preview based on configured policies that target these
                  regulatory packs. Not yet surfaced as supported compliance
                  frameworks — use only as forward-looking signal.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.regulatoryPackPreview
                  .filter((entry) => entry.policyCount > 0)
                  .map((entry) => (
                    <div
                      key={entry.pack}
                      className="rounded-lg border border-white/5 bg-black/20 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {entry.pack}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] text-amber-300 border-amber-400/20 bg-amber-400/10"
                          >
                            {entry.evidenceLevel}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                          <span>
                            <span className="text-white">{entry.policyCount}</span>{" "}
                            policies
                          </span>
                          <span>
                            <span className="text-emerald-300">
                              {entry.enforcedPolicyCount}
                            </span>{" "}
                            enforced
                          </span>
                          <span>
                            <span className="text-amber-300">
                              {entry.recentViolationCount}
                            </span>{" "}
                            recent violations
                          </span>
                        </div>
                      </div>
                      {entry.controlAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {entry.controlAreas.map((area) => (
                            <Badge
                              key={`${entry.pack}:${area}`}
                              variant="outline"
                              className="text-[10px] text-sky-300 border-sky-400/20 bg-sky-400/10"
                            >
                              {area}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="space-y-1">
                        {entry.policies.map((policy) => (
                          <div
                            key={`${entry.pack}:${policy.id}`}
                            className="flex flex-wrap items-center gap-2 text-xs"
                          >
                            <span className="text-zinc-200">{policy.title}</span>
                            <code className="font-mono text-[10px] text-zinc-500">
                              {policy.ruleId}
                            </code>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${policySeverityBadgeClass[policy.severity as DashboardPolicy["severity"]] ?? "text-zinc-300 border-white/10 bg-black/20"}`}
                            >
                              {policy.severity}
                            </Badge>
                            {policy.enforce ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-emerald-300 border-emerald-400/20 bg-emerald-400/10"
                              >
                                enforced
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-zinc-400 border-white/10 bg-black/20"
                              >
                                advisory
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* A.5 / CC1 — Policy Governance */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                Policy Governance
                <DashboardInfoButton
                  content={dashboardHelp.compliancePolicyGovernance}
                />
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
                    <TableHead className="text-zinc-400">Policy</TableHead>
                    <TableHead className="text-zinc-400">Kind</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Severity</TableHead>
                    <TableHead className="text-zinc-400">Priority</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.policyGovernance.policies.map((p) => (
                    <TableRow key={p.id} className="border-white/5">
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          <div className="text-white">{p.title}</div>
                          <div className="font-mono text-xs text-zinc-500">
                            {p.ruleId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs text-zinc-300 border-white/10 bg-black/20"
                        >
                          {p.kind}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${policyStatusBadgeClass[p.status]}`}
                          >
                            {p.status}
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
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${policySeverityBadgeClass[p.severity]}`}
                        >
                          {p.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {p.priority}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm text-right">
                        {formatDate(p.createdAt)}
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
                <DashboardInfoButton
                  content={dashboardHelp.complianceAccessControl}
                />
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
                          ? formatDate(k.lastUsedAt)
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
                <DashboardInfoButton
                  content={dashboardHelp.complianceViolations}
                />
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
                      <TableHead className="text-zinc-400">Policy</TableHead>
                      <TableHead className="text-zinc-400">Severity</TableHead>
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
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            <div className="text-white">{r.ruleTitle}</div>
                            <div className="font-mono text-xs text-zinc-500">
                              {r.ruleId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.policySeverity ? (
                            <Badge
                              variant="outline"
                              className={`text-xs ${policySeverityBadgeClass[r.policySeverity]}`}
                            >
                              {r.policySeverity}
                            </Badge>
                          ) : (
                            <span className="text-zinc-500 text-sm">—</span>
                          )}
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

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Gauge className="h-4 w-4 text-emerald-400" />
                Review Evidence
                <DashboardInfoButton
                  content={dashboardHelp.complianceReviewEvidence}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Total Reviews</p>
                  <p className="text-2xl font-bold text-white">
                    {report.reviewEvidence.total}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Passed</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {report.reviewEvidence.passed}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Failed</p>
                  <p className="text-2xl font-bold text-red-400">
                    {report.reviewEvidence.failed}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Blocking</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {report.reviewEvidence.blockingFailures}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Pass Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {report.reviewEvidence.passRate !== null
                      ? `${report.reviewEvidence.passRate}%`
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-sky-300" />
                Workflow Evidence
                <DashboardInfoButton
                  content={dashboardHelp.complianceWorkflowEvidence}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Snapshots</p>
                  <p className="text-2xl font-bold text-white">
                    {report.workflowEvidence.totalSnapshots}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Approved</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {report.workflowEvidence.approvedSnapshots}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Ready</p>
                  <p className="text-2xl font-bold text-sky-300">
                    {report.workflowEvidence.readySnapshots}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Blocked</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {report.workflowEvidence.blockedSnapshots}
                  </p>
                </div>
              </div>
              {report.workflowEvidence.recent.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead className="text-zinc-400">Repo</TableHead>
                      <TableHead className="text-zinc-400">Phase</TableHead>
                      <TableHead className="text-zinc-400">Approval</TableHead>
                      <TableHead className="text-zinc-400">Review</TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Seen
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.workflowEvidence.recent.map((row, index) => (
                      <TableRow key={`${row.sessionId ?? "none"}-${index}`} className="border-white/5">
                        <TableCell className="text-sm text-white">
                          {row.repo ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-300">
                          {row.phase}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-300">
                          {row.approvalStatus}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-300">
                          {row.reviewStatus}
                        </TableCell>
                        <TableCell className="text-right text-sm text-zinc-500">
                          {formatDateTime(row.receivedAt)}
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
                <DashboardInfoButton
                  content={dashboardHelp.complianceAuditTrail}
                />
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
                        Occurred
                      </TableHead>
                      <TableHead className="text-zinc-400">Evidence</TableHead>
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
                          {formatDateTime(e.occurredAt ?? e.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {e.evidenceLevel && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${e.evidenceLevel === "required" ? "text-red-300 border-red-400/20 bg-red-400/10" : "text-zinc-300 border-white/10 bg-black/20"}`}
                              >
                                {e.evidenceLevel}
                              </Badge>
                            )}
                            {e.source && (
                              <Badge
                                variant="outline"
                                className="text-xs text-zinc-300 border-white/10"
                              >
                                {e.source}
                              </Badge>
                            )}
                          </div>
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
                        <TableCell className="text-zinc-500 text-sm">
                          <div className="max-w-[180px] truncate">
                            {e.repo || "—"}
                          </div>
                          <div className="font-mono text-[11px] text-zinc-600">
                            {e.sessionId || e.ipAddress || "—"}
                          </div>
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
                <DashboardInfoButton
                  content={dashboardHelp.complianceSystemUsage}
                  className="ml-2 inline-flex"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {[
                  {
                    label: "Tool Calls",
                    value: report.telemetry.totalToolCalls,
                  },
                  {
                    label: "Succeeded",
                    value: report.telemetry.successfulToolCalls,
                  },
                  {
                    label: "Failed",
                    value: report.telemetry.failedToolCalls,
                  },
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
                    label: "Sessions",
                    value: report.telemetry.sessionEnds,
                  },
                  {
                    label: "Instances",
                    value: report.telemetry.activeInstances,
                  },
                  {
                    label: "Pushes",
                    value: report.telemetry.telemetryPushes,
                  },
                  {
                    label: "Duration",
                    value: `${formatNumber(Math.round(report.telemetry.totalDurationMs / 1000))}s`,
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xs text-zinc-500">{s.label}</p>
                    <p className="text-xl font-bold text-white">
                      {typeof s.value === "number" ? formatNumber(s.value) : s.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Residual Customer Responsibilities
                <DashboardInfoButton
                  content={dashboardHelp.complianceResponsibilities}
                  className="ml-2 inline-flex"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.residualResponsibilities.map((item) => (
                  <div
                    key={item}
                    className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm text-zinc-300"
                  >
                    {item}
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
