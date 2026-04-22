"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  HeartPulse,
  Rocket,
  ShieldCheck,
  AlertCircle,
  Activity,
  KeyRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

type ApiKey = {
  id: string;
  name: string;
  environment: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const signalBadgeClass: Record<OperationsSignal["status"], string> = {
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

export default function RolloutPage() {
  const [operations, setOperations] = useState<OperationsSummary | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keyAccessRestricted, setKeyAccessRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [opsRes, keysRes] = await Promise.allSettled([
        fetch("/api/v1/operations/summary"),
        fetch("/api/v1/api-keys"),
      ]);

      if (opsRes.status !== "fulfilled" || !opsRes.value.ok) {
        throw new Error("Failed to load rollout summary");
      }

      const opsJson = await opsRes.value.json();
      setOperations(opsJson);

      if (keysRes.status === "fulfilled") {
        if (keysRes.value.ok) {
          const keysJson = await keysRes.value.json();
          setKeys(keysJson.keys ?? []);
          setKeyAccessRestricted(false);
        } else if (keysRes.value.status === 403) {
          setKeys([]);
          setKeyAccessRestricted(true);
        } else {
          throw new Error("Failed to load API keys");
        }
      } else {
        throw new Error("Failed to load API keys");
      }
    } catch {
      setError("Failed to load rollout readiness data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const signals = operations
    ? [
        operations.summary.signals.policyHealth,
        operations.summary.signals.syncStatus,
        operations.summary.signals.telemetryHealth,
        operations.summary.signals.reviewCoverage,
      ]
    : [];

  const packageSummary = operations?.summary.package;
  const rolloutReady =
    operations?.summary.checklist.every((item) => item.status === "complete") ??
    false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rollout Readiness</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Launch the governed workflow with live policy, telemetry, review,
            and audit signals.
          </p>
        </div>
        {packageSummary && (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-white/10 bg-black/20 text-zinc-300"
            >
              {packageSummary.plan}
            </Badge>
            <Badge
              variant="outline"
              className={
                rolloutReady
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                  : "border-amber-400/20 bg-amber-400/10 text-amber-400"
              }
            >
              {rolloutReady ? "ready to expand" : "pilot only"}
            </Badge>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading rollout readiness...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Package
                </CardTitle>
                <Rocket className="h-4 w-4 text-zinc-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {packageSummary?.plan ?? "—"}
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Keys
                </CardTitle>
                <KeyRound className="h-4 w-4 text-zinc-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {packageSummary?.activeApiKeys ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Active Instances
                </CardTitle>
                <Activity className="h-4 w-4 text-zinc-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {packageSummary?.activeInstances ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Client Versions
                </CardTitle>
                <HeartPulse className="h-4 w-4 text-zinc-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {packageSummary?.distinctVersions ?? 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <HeartPulse className="h-4 w-4 text-zinc-400" />
                  Operational Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {signals.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {signals.map((signal) => (
                      <Link
                        key={signal.id}
                        href={signal.href}
                        className="rounded-xl border border-white/5 bg-black/20 p-4 transition-colors hover:border-white/10"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={signalBadgeClass[signal.status]}
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
                        <div className="mt-3 flex items-center gap-1 text-[11px] text-zinc-600">
                          <ArrowRight className="h-3 w-3" />
                          Updated {timeAgo(signal.updatedAt)}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600">
                    No rollout health signals are available yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <ClipboardCheck className="h-4 w-4 text-zinc-400" />
                  Rollout Gate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {operations?.summary.checklist?.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-lg border border-white/5 bg-black/20 px-3 py-3 transition-colors hover:border-white/10"
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
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <KeyRound className="h-4 w-4 text-zinc-400" />
                  Environments and Access Keys
                </CardTitle>
              </CardHeader>
              <CardContent>
                {keyAccessRestricted ? (
                  <p className="text-sm text-zinc-600">
                    API key details are visible to admins only. Operational
                    rollout status above remains available without key access.
                  </p>
                ) : keys.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-zinc-400">Name</TableHead>
                        <TableHead className="text-zinc-400">
                          Environment
                        </TableHead>
                        <TableHead className="text-zinc-400">Scopes</TableHead>
                        <TableHead className="text-zinc-400">
                          Last Used
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.map((key) => (
                        <TableRow key={key.id} className="border-white/5">
                          <TableCell className="text-white">
                            {key.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="border-white/10 bg-black/20 text-zinc-300"
                            >
                              {key.environment}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-zinc-500">
                            {key.scopes.join(", ")}
                          </TableCell>
                          <TableCell className="text-sm text-zinc-500">
                            {timeAgo(key.lastUsedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-zinc-600">
                    No keys provisioned yet. Create a production key before
                    expanding rollout.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <ShieldCheck className="h-4 w-4 text-zinc-400" />
                  {keyAccessRestricted ? "Rollout Actions" : "Operator Actions"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!keyAccessRestricted && (
                  <Link
                    href="/dashboard/api-keys"
                    className="block rounded-lg border border-white/5 bg-black/20 px-3 py-3 text-zinc-300 transition-colors hover:border-white/10 hover:text-white"
                  >
                    Manage environment keys
                  </Link>
                )}
                <Link
                  href="/dashboard/policies"
                  className="block rounded-lg border border-white/5 bg-black/20 px-3 py-3 text-zinc-300 transition-colors hover:border-white/10 hover:text-white"
                >
                  Publish blocking policies
                </Link>
                <Link
                  href="/dashboard/reviews"
                  className="block rounded-lg border border-white/5 bg-black/20 px-3 py-3 text-zinc-300 transition-colors hover:border-white/10 hover:text-white"
                >
                  Verify review coverage
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="block rounded-lg border border-white/5 bg-black/20 px-3 py-3 text-zinc-300 transition-colors hover:border-white/10 hover:text-white"
                >
                  Confirm compliance evidence
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
