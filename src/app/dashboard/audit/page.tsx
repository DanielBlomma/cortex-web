"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardInfoButton } from "@/components/dashboard/dashboard-info-button";
import { FileSearch, ShieldCheck, TerminalSquare, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dashboardHelp } from "@/lib/dashboard/help-content";

type AuditEvent = {
  id: string;
  source: "web" | "client";
  action: string;
  eventType: string | null;
  evidenceLevel: "required" | "diagnostic";
  resourceType: string;
  resourceId: string | null;
  repo: string | null;
  sessionId: string | null;
  instanceId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  createdAt: string;
};

type AuditSummary = {
  totals: {
    total: number;
    required: number;
    diagnostic: number;
    client: number;
    web: number;
  };
  byEventType: {
    eventType: string;
    count: number;
  }[];
  events: AuditEvent[];
};

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

const evidenceBadgeClass = {
  required: "text-red-300 border-red-400/20 bg-red-400/10",
  diagnostic: "text-zinc-300 border-white/10 bg-black/20",
};

export default function AuditPage() {
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [evidenceLevel, setEvidenceLevel] = useState("all");
  const [eventType, setEventType] = useState("all");

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "150");
      if (search.trim()) params.set("search", search.trim());
      if (source !== "all") params.set("source", source);
      if (evidenceLevel !== "all") params.set("evidence_level", evidenceLevel);
      if (eventType !== "all") params.set("event_type", eventType);

      const res = await fetch(`/api/v1/audit/summary?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load audit trail");
      }

      setSummary(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  }, [search, source, evidenceLevel, eventType]);

  useEffect(() => {
    void fetchAudit();
  }, [fetchAudit]);

  const eventTypes = summary?.byEventType ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Search evidence from local enterprise activity and web control-plane
            actions.
          </p>
        </div>
        <DashboardInfoButton
          content={dashboardHelp.auditPage}
          variant="pill"
          label="Page guide"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? "..." : summary?.totals.total ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Required Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-300">
              {loading ? "..." : summary?.totals.required ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-200">
              {loading ? "..." : summary?.totals.diagnostic ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Client Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-300">
              {loading ? "..." : summary?.totals.client ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Web Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-300">
              {loading ? "..." : summary?.totals.web ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label className="text-zinc-300">Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="tool, repo, description, metadata"
              className="mt-1 border-white/10 bg-black/30"
            />
          </div>
          <div>
            <Label className="text-zinc-300">Source</Label>
            <Select value={source} onValueChange={(value) => setSource(value ?? "all")}>
              <SelectTrigger className="mt-1 w-full border-white/10 bg-black/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                <SelectItem value="client">client</SelectItem>
                <SelectItem value="web">web</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-zinc-300">Evidence Level</Label>
            <Select
              value={evidenceLevel}
              onValueChange={(value) => setEvidenceLevel(value ?? "all")}
            >
              <SelectTrigger className="mt-1 w-full border-white/10 bg-black/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                <SelectItem value="required">required</SelectItem>
                <SelectItem value="diagnostic">diagnostic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-zinc-300">Event Type</Label>
            <Select value={eventType} onValueChange={(value) => setEventType(value ?? "all")}>
              <SelectTrigger className="mt-1 w-full border-white/10 bg-black/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                {eventTypes.map((row) => (
                  <SelectItem key={row.eventType} value={row.eventType}>
                    {row.eventType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px,1fr]">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <FileSearch className="h-4 w-4 text-zinc-400" />
              Event Types
              <DashboardInfoButton content={dashboardHelp.auditEventTypes} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventTypes.length === 0 ? (
              <p className="text-sm text-zinc-500">No events match the current filters.</p>
            ) : (
              <div className="space-y-2">
                {eventTypes.map((row) => (
                  <div
                    key={row.eventType}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                  >
                    <span className="text-sm text-zinc-200">{row.eventType}</span>
                    <Badge variant="outline" className="text-xs text-zinc-300 border-white/10">
                      {row.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-white text-base">
              Recent Evidence
              <DashboardInfoButton
                content={dashboardHelp.auditRecentEvidence}
                className="ml-2 inline-flex"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-zinc-500">Loading...</p>
            ) : summary?.events.length ? (
              <div className="space-y-3">
                {summary.events.map((event) => {
                  const toolName =
                    typeof event.metadata?.tool === "string"
                      ? event.metadata.tool
                      : null;
                  const resultCount =
                    typeof event.metadata?.result_count === "number"
                      ? event.metadata.result_count
                      : null;
                  const durationMs =
                    typeof event.metadata?.duration_ms === "number"
                      ? event.metadata.duration_ms
                      : null;

                  return (
                    <div
                      key={event.id}
                      className="rounded-xl border border-white/5 bg-black/20 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={evidenceBadgeClass[event.evidenceLevel]}
                        >
                          {event.evidenceLevel}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-zinc-300 border-white/10">
                          {event.source}
                        </Badge>
                        {event.eventType && (
                          <Badge variant="outline" className="text-xs text-sky-300 border-sky-400/20 bg-sky-400/10">
                            {event.eventType}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs text-zinc-300 border-white/10">
                          {event.resourceType}
                        </Badge>
                        <span className="ml-auto text-xs text-zinc-500">
                          {timeAgo(event.occurredAt)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-white">{event.description}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <TerminalSquare className="h-3.5 w-3.5" />
                          {event.action}
                        </span>
                        {event.repo && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5" />
                            {event.repo}
                          </span>
                        )}
                        {event.sessionId && <span>session {event.sessionId}</span>}
                        {event.instanceId && <span>instance {event.instanceId}</span>}
                      </div>
                      {toolName && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs text-emerald-300 border-emerald-400/20 bg-emerald-400/10">
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            {toolName}
                          </Badge>
                          {resultCount !== null && (
                            <span className="text-xs text-zinc-500">
                              {resultCount} results
                            </span>
                          )}
                          {durationMs !== null && (
                            <span className="text-xs text-zinc-500">
                              {durationMs} ms
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No audit evidence recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
