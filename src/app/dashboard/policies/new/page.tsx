"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Shield, Check } from "lucide-react";
import Link from "next/link";
import {
  PREDEFINED_RULES,
  type PredefinedRule,
} from "@/lib/policies/predefined-rules";

type Policy = { ruleId: string };

export default function NewPolicyPage() {
  const router = useRouter();
  const [existingPolicies, setExistingPolicies] = useState<Policy[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom form state
  const [customRuleId, setCustomRuleId] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(50);
  const [scope, setScope] = useState("global");
  const [enforce, setEnforce] = useState(true);

  const fetchExisting = useCallback(async () => {
    const res = await fetch("/api/v1/policies");
    const data = await res.json();
    setExistingPolicies(data.policies ?? []);
  }, []);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const isActive = (ruleId: string) =>
    existingPolicies.some((p) => p.ruleId === ruleId);

  const enablePredefined = async (rule: PredefinedRule) => {
    if (isActive(rule.id)) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/v1/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ruleId: rule.id,
        description: rule.description,
        priority: rule.defaultPriority,
        scope: "global",
        enforce: true,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to enable rule");
      setSubmitting(false);
      return;
    }
    router.push("/dashboard/policies");
  };

  const createCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const ruleId = customRuleId.startsWith("custom:")
      ? customRuleId
      : `custom:${customRuleId}`;
    const res = await fetch("/api/v1/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleId, description, priority, scope, enforce }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create policy");
      setSubmitting(false);
      return;
    }
    router.push("/dashboard/policies");
  };

  const categoryColor = {
    security: "text-red-400 border-red-400/20 bg-red-400/10",
    quality: "text-blue-400 border-blue-400/20 bg-blue-400/10",
    compliance: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/policies"
          className="text-sm text-zinc-500 hover:text-white flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Policies
        </Link>
        <h1 className="text-2xl font-bold text-white">Create Policy</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Enable a predefined rule or create a custom one.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Tabs defaultValue="predefined">
        <TabsList>
          <TabsTrigger value="predefined">Predefined Rules</TabsTrigger>
          <TabsTrigger value="custom">Custom Rule</TabsTrigger>
        </TabsList>

        <TabsContent value="predefined">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {PREDEFINED_RULES.map((rule) => {
              const active = isActive(rule.id);
              return (
                <Card
                  key={rule.id}
                  className="bg-white/[0.02] border-white/5"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-xs ${categoryColor[rule.category]}`}
                      >
                        {rule.category}
                      </Badge>
                      <span className="text-xs text-zinc-500">
                        Priority: {rule.defaultPriority}
                      </span>
                    </div>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4 text-zinc-400" />
                      {rule.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-zinc-400 text-sm mb-4">
                      {rule.description}
                    </p>
                    {active ? (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" /> Already Active
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => enablePredefined(rule)}
                        disabled={submitting}
                      >
                        Enable
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <Card className="bg-white/[0.02] border-white/5 mt-4">
            <CardContent className="pt-6">
              <form onSubmit={createCustom} className="space-y-4">
                <div>
                  <Label className="text-zinc-300">Rule ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-zinc-500 text-sm font-mono">
                      custom:
                    </span>
                    <Input
                      placeholder="my-rule-name"
                      value={customRuleId}
                      onChange={(e) => setCustomRuleId(e.target.value)}
                      className="bg-black/30 border-white/10 font-mono"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-zinc-300">Description</Label>
                  <Textarea
                    placeholder="What does this rule enforce?"
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
                      placeholder="global"
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
                <Button type="submit" disabled={submitting} className="w-full">
                  Create Policy
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
