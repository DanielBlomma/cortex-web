"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { isPredefinedRule } from "@/lib/policies/predefined-rules";
import type { Policy } from "@/lib/types/policy";

export default function EditPolicyPage() {
  const params = useParams();
  const router = useRouter();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
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
      setPolicy(data.policy);
      setDescription(data.policy.description);
      setPriority(data.policy.priority);
      setScope(data.policy.scope);
      setEnforce(data.policy.enforce);
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
        body: JSON.stringify({ description, priority, scope, enforce }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }
      router.push("/dashboard/policies");
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-zinc-500 text-sm p-6">Loading...</p>;
  }

  if (!policy) {
    return <p className="text-zinc-500 text-sm p-6">Policy not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/policies"
          className="text-sm text-zinc-500 hover:text-white flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Policies
        </Link>
        <h1 className="text-2xl font-bold text-white">Edit Policy</h1>
        <div className="flex items-center gap-2 mt-2">
          <code className="text-sm font-mono text-zinc-400 bg-white/5 px-2 py-1 rounded">
            {policy.ruleId}
          </code>
          {isPredefinedRule(policy.ruleId) && (
            <Badge variant="secondary" className="text-xs">
              Predefined
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Card className="bg-white/[0.02] border-white/5">
        <CardContent className="pt-6">
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label className="text-zinc-300">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-black/30 border-white/10 mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Priority (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="bg-black/30 border-white/10 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Scope</Label>
                <Input
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="bg-black/30 border-white/10 mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEnforce(!enforce)}
                className="cursor-pointer"
              >
                <Badge variant={enforce ? "default" : "outline"}>
                  {enforce ? "Enforced" : "Disabled"}
                </Badge>
              </button>
              <span className="text-xs text-zinc-500">
                Click to toggle enforcement
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
