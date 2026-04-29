"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isPredefinedRule } from "@/lib/policies/predefined-rules";
import type { Policy } from "@/lib/types/policy";

const statusBadgeClass: Record<Policy["status"], string> = {
  active: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
  draft: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  disabled: "text-zinc-400 border-white/10 bg-black/20",
  archived: "text-zinc-500 border-white/10 bg-black/30",
};

const severityBadgeClass: Record<Policy["severity"], string> = {
  block: "text-red-400 border-red-400/20 bg-red-400/10",
  error: "text-orange-400 border-orange-400/20 bg-orange-400/10",
  warning: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  info: "text-sky-300 border-sky-400/20 bg-sky-400/10",
};

export default function EditPolicyPage() {
  const params = useParams();
  const router = useRouter();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Policy["status"]>("active");
  const [severity, setSeverity] = useState<Policy["severity"]>("block");
  const [priority, setPriority] = useState(50);
  const [scope, setScope] = useState("global");
  const [enforce, setEnforce] = useState(true);

  const fetchPolicy = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/policies/${params.id}`);
      if (!res.ok) {
        const msg = res.status === 404 ? null : "Failed to load policy";
        setError(msg);
        return;
      }
      const data = await res.json();
      const nextPolicy = data.policy as Policy;
      setPolicy(nextPolicy);
      setTitle(nextPolicy.title);
      setDescription(nextPolicy.description);
      setStatus(nextPolicy.status);
      setSeverity(nextPolicy.severity);
      setPriority(nextPolicy.priority);
      setScope(nextPolicy.scope);
      setEnforce(nextPolicy.enforce);
    } catch {
      setError("Failed to load policy");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void fetchPolicy();
  }, [fetchPolicy]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/policies/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          status,
          severity,
          priority,
          scope,
          enforce,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }
      router.push("/dashboard/policies");
    } catch {
      setError("Network error - please try again");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-zinc-500">Loading...</p>;
  }

  if (!policy) {
    return <p className="p-6 text-sm text-zinc-500">Policy not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/policies"
          className="mb-4 flex items-center gap-1 text-sm text-zinc-500 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Policies
        </Link>
        <h1 className="text-2xl font-bold text-white">Edit Policy</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded bg-white/5 px-2 py-1 font-mono text-sm text-zinc-400">
            {policy.ruleId}
          </code>
          <Badge variant="outline" className="text-xs text-zinc-300 border-white/10">
            {policy.kind}
          </Badge>
          {(policy.kind === "predefined" || isPredefinedRule(policy.ruleId)) && (
            <Badge variant="secondary" className="text-xs">
              Predefined
            </Badge>
          )}
          {policy.type && (
            <Badge
              variant="outline"
              className="text-xs font-mono text-sky-300 border-sky-400/20 bg-sky-400/10"
            >
              {policy.type}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`text-xs ${statusBadgeClass[status]}`}
          >
            {status}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${severityBadgeClass[severity]}`}
          >
            {severity}
          </Badge>
          {policy.controlAreas?.map((area) => (
            <Badge
              key={`${policy.id}:area:${area}`}
              variant="outline"
              className="text-xs text-sky-300 border-sky-400/20 bg-sky-400/10"
            >
              {area}
            </Badge>
          ))}
          {policy.plannedRegulatoryPacks?.map((pack) => (
            <Badge
              key={`${policy.id}:pack:${pack}`}
              variant="outline"
              className="text-xs text-amber-300 border-amber-400/20 bg-amber-400/10"
            >
              Planned: {pack}
            </Badge>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="pt-6">
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label className="text-zinc-300">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 border-white/10 bg-black/30"
                required
              />
            </div>

            <div>
              <Label className="text-zinc-300">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 border-white/10 bg-black/30"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="text-zinc-300">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as Policy["status"])}
                >
                  <SelectTrigger className="mt-1 w-full border-white/10 bg-black/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">draft</SelectItem>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="disabled">disabled</SelectItem>
                    <SelectItem value="archived">archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-300">Severity</Label>
                <Select
                  value={severity}
                  onValueChange={(value) =>
                    setSeverity(value as Policy["severity"])
                  }
                >
                  <SelectTrigger className="mt-1 w-full border-white/10 bg-black/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">info</SelectItem>
                    <SelectItem value="warning">warning</SelectItem>
                    <SelectItem value="error">error</SelectItem>
                    <SelectItem value="block">block</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="text-zinc-300">Priority (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="mt-1 border-white/10 bg-black/30"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Scope</Label>
                <Input
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="mt-1 border-white/10 bg-black/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="text-zinc-300">Kind</Label>
                <Input
                  value={policy.kind}
                  disabled
                  className="mt-1 border-white/10 bg-black/30 text-zinc-500"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Evaluator Type</Label>
                <Input
                  value={policy.type ?? "n/a"}
                  disabled
                  className="mt-1 border-white/10 bg-black/30 text-zinc-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEnforce(!enforce)}
                className="cursor-pointer"
              >
                <Badge
                  variant="outline"
                  className={
                    enforce
                      ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                      : "text-zinc-400 border-white/10 bg-black/20"
                  }
                >
                  {enforce ? "Blocking" : "Advisory"}
                </Badge>
              </button>
              <span className="text-xs text-zinc-500">
                Click to toggle whether this policy blocks approval
              </span>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Link href="/dashboard/policies">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
