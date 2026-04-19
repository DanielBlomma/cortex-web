"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Check,
  Pencil,
  Plus,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  PREDEFINED_RULES,
  type PredefinedRule,
  isPredefinedRule,
} from "@/lib/policies/predefined-rules";
import {
  EVALUATOR_TYPES,
  getEvaluatorType,
  summarizeConfig,
  type EvaluatorField,
} from "@/lib/policies/evaluator-types";
import type { Policy } from "@/lib/types/policy";

type PolicyDraft = {
  ruleId: string;
  description: string;
  priority: number;
  scope: string;
  enforce: boolean;
  type: string | null;
  config: Record<string, unknown>;
};

const EMPTY_DRAFT: PolicyDraft = {
  ruleId: "",
  description: "",
  priority: 50,
  scope: "global",
  enforce: true,
  type: null,
  config: {},
};

const categoryColor: Record<PredefinedRule["category"], string> = {
  security: "text-red-400 border-red-400/20 bg-red-400/10",
  quality: "text-blue-400 border-blue-400/20 bg-blue-400/10",
  compliance: "text-amber-400 border-amber-400/20 bg-amber-400/10",
};

const enforceBadgeClass = {
  true: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
  false: "text-zinc-400 border-white/10 bg-black/20",
};

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

function EvaluatorFieldInput({
  field,
  value,
  onChange,
}: {
  field: EvaluatorField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.kind === "text") {
    return (
      <div>
        <Label className="text-zinc-300">{field.label}</Label>
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className="mt-1 border-white/10 bg-black/30 font-mono"
        />
      </div>
    );
  }
  if (field.kind === "textarea") {
    return (
      <div>
        <Label className="text-zinc-300">{field.label}</Label>
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          className="mt-1 border-white/10 bg-black/30"
        />
      </div>
    );
  }
  if (field.kind === "number") {
    const current = typeof value === "number" ? value : field.defaultValue;
    return (
      <div>
        <Label className="text-zinc-300">{field.label}</Label>
        <Input
          type="number"
          min={field.min}
          max={field.max}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-1 border-white/10 bg-black/30"
        />
      </div>
    );
  }
  if (field.kind === "select") {
    const current = typeof value === "string" ? value : field.defaultValue ?? "";
    return (
      <div>
        <Label className="text-zinc-300">{field.label}</Label>
        <Select value={current} onValueChange={onChange}>
          <SelectTrigger className="mt-1 w-full border-white/10 bg-black/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (field.kind === "multiselect") {
    const selected = new Set(
      Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [],
    );
    return (
      <div>
        <Label className="text-zinc-300">{field.label}</Label>
        <div className="mt-1 flex flex-wrap gap-2">
          {field.options.map((o) => {
            const active = selected.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  const next = new Set(selected);
                  if (active) next.delete(o.value);
                  else next.add(o.value);
                  onChange([...next]);
                }}
                className="cursor-pointer"
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    active
                      ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                      : "text-zinc-400 border-white/10 bg-black/20"
                  )}
                >
                  {o.label}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [draft, setDraft] = useState<PolicyDraft>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/policies");
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to load policies"));
      }
      const data = await res.json();
      setPolicies(data.policies ?? []);
      setPageError(null);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to load policies"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPolicies();
  }, [fetchPolicies]);

  const openCreateDialog = () => {
    setEditingPolicy(null);
    setDraft(EMPTY_DRAFT);
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (policy: Policy) => {
    setEditingPolicy(policy);
    setDraft({
      ruleId: policy.ruleId,
      description: policy.description,
      priority: policy.priority,
      scope: policy.scope,
      enforce: policy.enforce,
      type: policy.type ?? null,
      config:
        policy.config && typeof policy.config === "object" && !Array.isArray(policy.config)
          ? { ...(policy.config as Record<string, unknown>) }
          : {},
    });
    setDialogError(null);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const actionKey = `delete:${deleteTarget.id}`;
    setBusyKey(actionKey);

    try {
      const res = await fetch(`/api/v1/policies/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to delete policy"));
      }
      await fetchPolicies();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to delete policy"
      );
    } finally {
      setBusyKey(null);
      setDeleteTarget(null);
    }
  };

  const savePredefinedRule = async (rule: PredefinedRule) => {
    const actionKey = `predefined:${rule.id}`;
    setBusyKey(actionKey);

    try {
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
        throw new Error(await readErrorMessage(res, "Failed to add rule"));
      }

      await fetchPolicies();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to add rule");
    } finally {
      setBusyKey(null);
    }
  };

  const toggleEnforce = async (policy: Policy) => {
    const actionKey = `enforce:${policy.id}`;
    setBusyKey(actionKey);

    try {
      const res = await fetch(`/api/v1/policies/${policy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enforce: !policy.enforce }),
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "Failed to update enforcement")
        );
      }

      await fetchPolicies();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to update enforcement"
      );
    } finally {
      setBusyKey(null);
    }
  };

  const submitPolicy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setDialogError(null);

    const ruleId = editingPolicy
      ? draft.ruleId
      : draft.ruleId.startsWith("custom:")
        ? draft.ruleId.trim()
        : `custom:${draft.ruleId.trim()}`;

    const payload = {
      ruleId,
      description: draft.description.trim(),
      priority: Number(draft.priority),
      scope: draft.scope.trim() || "global",
      enforce: draft.enforce,
      type: draft.type,
      config: draft.type ? draft.config : null,
    };

    try {
      const res = await fetch(
        editingPolicy
          ? `/api/v1/policies/${editingPolicy.id}`
          : "/api/v1/policies",
        {
          method: editingPolicy ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingPolicy
              ? {
                  description: payload.description,
                  priority: payload.priority,
                  scope: payload.scope,
                  enforce: payload.enforce,
                  // type is locked on edit; config stays tunable so you can
                  // tweak e.g. severity without recreating the rule.
                  config: payload.config,
                }
              : payload
          ),
        }
      );

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(
            res,
            editingPolicy ? "Failed to update policy" : "Failed to create policy"
          )
        );
      }

      await fetchPolicies();
      setDialogOpen(false);
      setEditingPolicy(null);
      setDraft(EMPTY_DRAFT);
    } catch (error) {
      setDialogError(
        error instanceof Error
          ? error.message
          : editingPolicy
            ? "Failed to update policy"
            : "Failed to create policy"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPolicies = [...policies].sort((a, b) =>
    a.ruleId.localeCompare(b.ruleId)
  );
  const customPolicies = selectedPolicies.filter(
    (policy) => !isPredefinedRule(policy.ruleId)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Policies / Rules</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Add or remove rules directly from the dashboard, keep selected ones
            highlighted, and manage custom policies without leaving the page.
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Custom Rule
        </Button>
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {pageError}
        </div>
      )}

      <Card className="bg-white/[0.02] border-white/5">
        <CardHeader>
          <CardTitle className="text-white text-base">Selected</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-400">
              {selectedPolicies.length === 0
                ? "No policies selected yet."
                : `${selectedPolicies.length} selected rule${selectedPolicies.length === 1 ? "" : "s"} across your organization.`}
            </p>
            {selectedPolicies.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedPolicies.length} active
              </Badge>
            )}
          </div>
          {selectedPolicies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedPolicies.map((policy) => (
                <Badge
                  key={policy.id}
                  variant="outline"
                  className={cn(
                    "text-xs font-mono",
                    policy.enforce
                      ? "text-white border-white/15 bg-white/[0.04]"
                      : "text-zinc-400 border-white/10 bg-black/20"
                  )}
                >
                  {policy.ruleId}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/[0.02] border-white/5">
        <CardHeader>
          <CardTitle className="text-white text-base">Predefined Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PREDEFINED_RULES.map((rule) => {
                const policy = selectedPolicies.find(
                  (selected) => selected.ruleId === rule.id
                );
                const cardKey = `predefined:${rule.id}`;

                return (
                  <Card
                    key={rule.id}
                    className={cn(
                      "border transition-colors",
                      policy
                        ? "border-white/20 bg-white/[0.05] ring-1 ring-white/10"
                        : "bg-white/[0.02] border-white/5"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${categoryColor[rule.category]}`}
                            >
                              {rule.category}
                            </Badge>
                            {policy && (
                              <Badge
                                variant="outline"
                                className="text-emerald-400 border-emerald-400/20 bg-emerald-400/10 text-xs"
                              >
                                <Check className="mr-1 h-3 w-3" />
                                Selected
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="flex items-center gap-2 text-sm text-white">
                            <Shield className="h-4 w-4 text-zinc-400" />
                            {rule.name}
                          </CardTitle>
                          <p className="font-mono text-[11px] text-zinc-500">
                            {rule.id}
                          </p>
                        </div>
                        <span className="text-xs text-zinc-500">
                          Priority: {policy?.priority ?? rule.defaultPriority}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-zinc-400">
                        {policy?.description || rule.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {policy?.scope ?? "global"}
                        </Badge>
                        {policy && (
                          <button
                            type="button"
                            onClick={() => void toggleEnforce(policy)}
                            disabled={busyKey === `enforce:${policy.id}`}
                            className="cursor-pointer"
                          >
                            <Badge
                              variant="outline"
                              className={`text-xs ${enforceBadgeClass[String(policy.enforce) as "true" | "false"]}`}
                            >
                              {policy.enforce ? "Enforced" : "Disabled"}
                            </Badge>
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {policy ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(policy)}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(policy)}
                              disabled={busyKey === `delete:${policy.id}`}
                              className="text-zinc-400 hover:text-red-400"
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Remove
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => void savePredefinedRule(rule)}
                            disabled={busyKey === cardKey}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/[0.02] border-white/5">
        <CardHeader>
          <CardTitle className="text-white text-base">Custom Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <button
                type="button"
                onClick={openCreateDialog}
                className="text-left"
              >
                <Card className="h-full border-dashed border-white/10 bg-white/[0.02] transition-colors hover:border-white/20 hover:bg-white/[0.04]">
                  <CardContent className="flex h-full min-h-52 flex-col justify-between p-6">
                    <div className="space-y-3">
                      <Badge variant="outline" className="text-xs">
                        Custom
                      </Badge>
                      <div className="flex items-center gap-2 text-white">
                        <Sparkles className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm font-medium">
                          Create a new policy box
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400">
                        Add your own rule and manage it from a modal on this
                        page.
                      </p>
                    </div>
                    <div>
                      <Badge
                        variant="outline"
                        className="border-white/10 bg-black/20 text-zinc-300"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        New custom rule
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </button>

              {customPolicies.map((policy) => (
                <Card
                  key={policy.id}
                  className="border-white/20 bg-white/[0.05] ring-1 ring-white/10"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs text-violet-300 border-violet-400/20 bg-violet-400/10"
                          >
                            Custom
                          </Badge>
                          {policy.type && (
                            <Badge
                              variant="outline"
                              className="text-xs text-sky-300 border-sky-400/20 bg-sky-400/10 font-mono"
                            >
                              {policy.type}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="text-emerald-400 border-emerald-400/20 bg-emerald-400/10 text-xs"
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Selected
                          </Badge>
                        </div>
                        <CardTitle className="text-sm text-white">
                          {policy.ruleId.replace(/^custom:/, "")}
                        </CardTitle>
                        <p className="font-mono text-[11px] text-zinc-500">
                          {policy.ruleId}
                        </p>
                        {policy.type && (
                          <p className="font-mono text-[11px] text-zinc-500">
                            {summarizeConfig(policy.type, policy.config)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">
                        Priority: {policy.priority}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-zinc-400">
                      {policy.description || "No description provided yet."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {policy.scope}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => void toggleEnforce(policy)}
                        disabled={busyKey === `enforce:${policy.id}`}
                        className="cursor-pointer"
                      >
                        <Badge
                          variant="outline"
                          className={`text-xs ${enforceBadgeClass[String(policy.enforce) as "true" | "false"]}`}
                        >
                          {policy.enforce ? "Enforced" : "Disabled"}
                        </Badge>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(policy)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(policy)}
                        disabled={busyKey === `delete:${policy.id}`}
                        className="text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingPolicy(null);
            setDraft(EMPTY_DRAFT);
            setDialogError(null);
          }
        }}
      >
        <DialogContent className="border-white/10 bg-[#0d0d14] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingPolicy ? "Edit Policy / Rule" : "New Custom Rule"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingPolicy
                ? "Update the selected rule without leaving the dashboard."
                : "Create a custom policy as a new box directly from this page."}
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {dialogError}
            </div>
          )}

          <form onSubmit={submitPolicy} className="space-y-4">
            <div>
              <Label className="text-zinc-300">Rule ID</Label>
              {editingPolicy ? (
                <Input
                  value={draft.ruleId}
                  disabled
                  className="mt-1 border-white/10 bg-black/30 font-mono text-zinc-400"
                />
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-sm text-zinc-500">
                    custom:
                  </span>
                  <Input
                    placeholder="my-rule-name"
                    value={draft.ruleId}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        ruleId: event.target.value,
                      }))
                    }
                    className="border-white/10 bg-black/30 font-mono"
                    required
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="text-zinc-300">Description</Label>
              <Textarea
                placeholder="What does this rule enforce?"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="mt-1 border-white/10 bg-black/30"
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
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      priority: Number(event.target.value),
                    }))
                  }
                  className="mt-1 border-white/10 bg-black/30"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Scope</Label>
                <Input
                  value={draft.scope}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      scope: event.target.value,
                    }))
                  }
                  className="mt-1 border-white/10 bg-black/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    enforce: !current.enforce,
                  }))
                }
                className="cursor-pointer"
              >
                <Badge
                  variant="outline"
                  className={`text-xs ${enforceBadgeClass[String(draft.enforce) as "true" | "false"]}`}
                >
                  {draft.enforce ? "Enforced" : "Disabled"}
                </Badge>
              </button>
              <span className="text-xs text-zinc-500">
                Click to toggle enforcement
              </span>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-3">
              <div>
                <Label className="text-zinc-300">Evaluator type</Label>
                {editingPolicy && editingPolicy.type ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs text-sky-300 border-sky-400/20 bg-sky-400/10 font-mono"
                    >
                      {getEvaluatorType(editingPolicy.type)?.label ?? editingPolicy.type}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      Locked — delete and recreate to change type.
                    </span>
                  </div>
                ) : (
                  <Select
                    value={draft.type ?? "none"}
                    onValueChange={(v) => {
                      const newType = typeof v === "string" && v !== "none" ? v : null;
                      setDraft((current) => ({
                        ...current,
                        type: newType,
                        config: newType
                          ? { ...(getEvaluatorType(newType)?.defaultConfig ?? {}) }
                          : {},
                      }));
                    }}
                  >
                    <SelectTrigger className="mt-1 w-full border-white/10 bg-black/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        None (name-based dispatch)
                      </SelectItem>
                      {EVALUATOR_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {draft.type && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {getEvaluatorType(draft.type)?.description}
                  </p>
                )}
              </div>

              {draft.type &&
                getEvaluatorType(draft.type)?.fields.map((field) => (
                  <EvaluatorFieldInput
                    key={field.key}
                    field={field}
                    value={draft.config[field.key]}
                    onChange={(v) =>
                      setDraft((current) => ({
                        ...current,
                        config: { ...current.config, [field.key]: v },
                      }))
                    }
                  />
                ))}
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting
                ? editingPolicy
                  ? "Saving..."
                  : "Creating..."
                : editingPolicy
                  ? "Save Changes"
                  : "Create Policy"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="border-white/10 bg-[#0d0d14] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete policy?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently remove{" "}
              <span className="font-mono text-zinc-300">
                {deleteTarget?.ruleId}
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => void confirmDelete()}
              disabled={busyKey === `delete:${deleteTarget?.id}`}
            >
              {busyKey === `delete:${deleteTarget?.id}`
                ? "Deleting..."
                : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
