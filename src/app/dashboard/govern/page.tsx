"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Server,
  Activity,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type AiCliDetected = {
  name: string;
  tier: "prevent" | "wrap" | "detect" | "off";
  version?: string;
  last_seen?: string;
};

type Host = {
  host_id: string;
  os: string;
  os_version: string | null;
  govern_mode: "off" | "advisory" | "enforced";
  ai_clis_detected: AiCliDetected[] | null;
  active_frameworks: string[] | null;
  config_version: string | null;
  first_seen?: string;
  last_seen?: string;
};

type TamperEvent = {
  id: string;
  host_id: string;
  cli: string;
  hook_name: string;
  last_seen: string | null;
  detected_at?: string;
  resolved_at: string | null;
};

type UngovernedEvent = {
  id: string;
  host_id: string;
  cli: string;
  binary_path: string;
  sys_user: string | null;
  action_taken: string;
  detected_at?: string;
};

type ApplyEvent = {
  id: string;
  host_id: string;
  cli: string;
  version: string;
  source: string;
  success: boolean;
  error_message: string | null;
  applied_at?: string;
};

type Overview = {
  generated_at: string;
  org: {
    total_hosts: number;
    mode_breakdown: { off: number; advisory: number; enforced: number };
  };
  activity_7d: {
    ungoverned: number;
    tamper: number;
    apply_success: number;
    apply_failure: number;
  };
  hosts: Host[];
  recent: {
    tamper: TamperEvent[];
    ungoverned: UngovernedEvent[];
    apply: ApplyEvent[];
  };
};

function timeAgo(ts: string | undefined | null): string {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  if (!Number.isFinite(diff)) return "—";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function modeBadge(mode: string) {
  if (mode === "enforced") {
    return (
      <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-100">
        enforced
      </Badge>
    );
  }
  if (mode === "advisory") {
    return (
      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-100">
        advisory
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-zinc-100 text-zinc-700">
      off
    </Badge>
  );
}

function tierLabel(tier: string): string {
  if (tier === "prevent") return "Tier 1 (Prevent)";
  if (tier === "wrap") return "Tier 2 (Wrap)";
  if (tier === "detect") return "Tier 3 (Detect)";
  return tier;
}

export default function GovernOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/govern/overview");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as Overview;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        Loading govern overview…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="font-semibold text-destructive">Could not load govern overview</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const total = data.org.total_hosts;
  const enforced = data.org.mode_breakdown.enforced;
  const advisory = data.org.mode_breakdown.advisory;
  const off = data.org.mode_breakdown.off;
  const enforcedPct = total > 0 ? Math.round((enforced / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Govern Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compliance posture across all enrolled hosts. Last refreshed{" "}
            {timeAgo(data.generated_at)}.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled hosts</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">
              across {data.hosts.filter((h) => h.last_seen).length} active in 7d
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enforced</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enforced} <span className="text-sm text-muted-foreground">({enforcedPct}%)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {advisory} advisory · {off} off
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamper events 7d</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activity_7d.tamper}</div>
            <p className="text-xs text-muted-foreground">
              {data.activity_7d.ungoverned} ungoverned sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Config applies 7d</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.activity_7d.apply_success}
              {data.activity_7d.apply_failure > 0 && (
                <span className="ml-2 text-sm text-destructive">
                  / {data.activity_7d.apply_failure} failed
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">successful managed-settings writes</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Hosts</CardTitle>
        </CardHeader>
        <CardContent>
          {data.hosts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hosts enrolled yet. Run <code>sudo cortex enterprise &lt;api-key&gt;</code> on a host to enrol it.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Host</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>AI CLIs</TableHead>
                  <TableHead>Frameworks</TableHead>
                  <TableHead>Config</TableHead>
                  <TableHead>Last seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.hosts.map((host) => (
                  <TableRow key={host.host_id}>
                    <TableCell className="font-mono text-xs">{host.host_id}</TableCell>
                    <TableCell>
                      {host.os}
                      {host.os_version ? (
                        <span className="text-xs text-muted-foreground"> {host.os_version}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{modeBadge(host.govern_mode)}</TableCell>
                    <TableCell className="space-x-1">
                      {(host.ai_clis_detected ?? []).map((cli) => (
                        <Badge key={cli.name} variant="outline" className="text-xs">
                          {cli.name}: {tierLabel(cli.tier)}
                        </Badge>
                      ))}
                      {(host.ai_clis_detected ?? []).length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(host.active_frameworks ?? []).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {host.config_version ? host.config_version.slice(0, 12) + "…" : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(host.last_seen)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tamper">
            <TabsList>
              <TabsTrigger value="tamper">
                Tamper{" "}
                {data.recent.tamper.length > 0 ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({data.recent.tamper.length})
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="ungoverned">
                Ungoverned{" "}
                {data.recent.ungoverned.length > 0 ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({data.recent.ungoverned.length})
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="apply">Config applies</TabsTrigger>
            </TabsList>

            <TabsContent value="tamper" className="mt-4">
              {data.recent.tamper.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No tamper events in the last 7 days. <ShieldCheck className="inline h-4 w-4 text-emerald-600" />
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Detected</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>CLI</TableHead>
                      <TableHead>Hook</TableHead>
                      <TableHead>Last seen</TableHead>
                      <TableHead>Resolved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent.tamper.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs">{timeAgo(t.detected_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{t.host_id}</TableCell>
                        <TableCell>{t.cli}</TableCell>
                        <TableCell>{t.hook_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{timeAgo(t.last_seen)}</TableCell>
                        <TableCell className="text-xs">
                          {t.resolved_at ? (
                            <span className="text-emerald-600">{timeAgo(t.resolved_at)}</span>
                          ) : (
                            <span className="text-amber-600">unresolved</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="ungoverned" className="mt-4">
              {data.recent.ungoverned.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No ungoverned sessions detected in the last 7 days.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Detected</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>CLI</TableHead>
                      <TableHead>Binary</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent.ungoverned.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs">{timeAgo(u.detected_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{u.host_id}</TableCell>
                        <TableCell>{u.cli}</TableCell>
                        <TableCell className="font-mono text-xs">{u.binary_path}</TableCell>
                        <TableCell className="text-xs">{u.sys_user ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {u.action_taken}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="apply" className="mt-4">
              {data.recent.apply.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No managed-settings applies in the last 7 days.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applied</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>CLI</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent.apply.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">{timeAgo(a.applied_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{a.host_id}</TableCell>
                        <TableCell>{a.cli}</TableCell>
                        <TableCell className="font-mono text-xs">{a.version.slice(0, 12)}…</TableCell>
                        <TableCell className="text-xs">{a.source}</TableCell>
                        <TableCell>
                          {a.success ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                              <CheckCircle2 className="h-3 w-3" /> ok
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-destructive text-xs">
                              <XCircle className="h-3 w-3" />
                              {a.error_message ? a.error_message.slice(0, 40) : "failed"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
