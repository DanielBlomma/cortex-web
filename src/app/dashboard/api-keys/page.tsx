"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Plus, Copy, Trash2, Check, Download } from "lucide-react";

const AVAILABLE_SCOPES = ["telemetry", "policy", "audit-log"] as const;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function buildEnterpriseConfigYaml(apiKey: string) {
  return `enterprise:\n  endpoint: ${BASE_URL}\n  api_key: ${apiKey}\n\ntelemetry:\n  endpoint: ${BASE_URL}/api/v1/telemetry/push\n  api_key: ${apiKey}\n\npolicy:\n  endpoint: ${BASE_URL}/api/v1/policies/sync\n  api_key: ${apiKey}`;
}

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  rawKey: string | null;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["telemetry", "policy"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch("/api/v1/api-keys");
    const data = await res.json();
    setKeys(data.keys ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = async () => {
    setError(null);
    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName || "Default", scopes: newKeyScopes }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create key");
      return;
    }

    const data = await res.json();
    setCreatedKey(data.key.rawKey);
    setNewKeyName("");
    fetchKeys();
  };

  const confirmRevoke = async () => {
    if (!deleteTarget) return;
    setRevoking(true);
    try {
      await fetch(`/api/v1/api-keys/${deleteTarget.id}`, { method: "DELETE" });
      await fetchKeys();
    } finally {
      setRevoking(false);
      setDeleteTarget(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Access</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Keys used by cortex-enterprise instances for telemetry and policy
            sync.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setCreatedKey(null);
            setError(null);
            setNewKeyName("");
            setNewKeyScopes(["telemetry", "policy"]);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Key
        </Button>
      </div>

      <Card className="bg-white/[0.02] border-white/5">
        <CardHeader>
          <CardTitle className="text-white text-base">Active Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              No API keys yet. Create one to connect cortex-enterprise
              instances.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Key</TableHead>
                  <TableHead className="text-zinc-400">Scopes</TableHead>
                  <TableHead className="text-zinc-400">Last Used</TableHead>
                  <TableHead className="text-zinc-400">Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id} className="border-white/5">
                    <TableCell className="text-white font-medium">
                      {key.name}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(key.rawKey ?? key.keyPrefix, key.id)
                        }
                        className="group flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="font-mono text-zinc-500 text-xs break-all">
                          {key.rawKey ?? `${key.keyPrefix}...`}
                        </span>
                        {copiedId === key.id ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {key.scopes?.map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-xs"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {key.lastUsedAt
                        ? formatDate(key.lastUsedAt)
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(key)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
          <CardTitle className="text-white text-base">Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-white/[0.06] text-xs font-bold text-zinc-300">1</span>
              <span className="text-sm font-medium text-white">Install</span>
            </div>
            <div className="ml-8 relative group">
              <pre className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 pr-12 text-sm text-zinc-300 font-mono">
                npm install -g @danielblomma/cortex-enterprise
              </pre>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    "npm install -g @danielblomma/cortex-enterprise",
                    "install"
                  )
                }
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {copiedId === "install" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-zinc-400" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-white/[0.06] text-xs font-bold text-zinc-300">2</span>
              <span className="text-sm font-medium text-white">Initialize your repo</span>
            </div>
            <div className="ml-8 relative group">
              <pre className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 pr-12 text-sm text-zinc-300 font-mono">
                cd your-repo && cortex init --bootstrap
              </pre>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    "cortex init --bootstrap",
                    "init"
                  )
                }
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {copiedId === "init" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-zinc-400" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-white/[0.06] text-xs font-bold text-zinc-300">3</span>
              <span className="text-sm font-medium text-white">Download config to <code className="text-zinc-300 bg-white/[0.06] px-1.5 py-0.5 rounded text-xs">.context/</code></span>
            </div>
            <div className="ml-8 space-y-3">
              <div className="relative group">
                <pre className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 pr-24 text-xs text-zinc-400 font-mono overflow-x-auto">
{buildEnterpriseConfigYaml(
  keys.length > 0
    ? keys[0].rawKey ?? keys[0].keyPrefix + "..."
    : "ctx_YOUR_KEY_HERE"
)}
                </pre>
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const keyPlaceholder = keys.length > 0 ? keys[0].rawKey ?? keys[0].keyPrefix + "..." : "ctx_YOUR_KEY_HERE";
                      const yaml = buildEnterpriseConfigYaml(keyPlaceholder);
                      void copyToClipboard(yaml, "yaml");
                    }}
                    className="p-1.5 rounded-md bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copiedId === "yaml" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-zinc-500" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const keyPlaceholder = keys.length > 0 ? keys[0].rawKey ?? keys[0].keyPrefix + "..." : "ctx_YOUR_KEY_HERE";
                      const yaml = `${buildEnterpriseConfigYaml(keyPlaceholder)}\n`;
                      const blob = new Blob([yaml], { type: "text/yaml" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "enterprise.yml";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="p-1.5 rounded-md bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Download enterprise.yml"
                  >
                    <Download className="h-3.5 w-3.5 text-zinc-500" />
                  </button>
                </div>
              </div>
              {keys.length > 0 && !keys[0].rawKey && (
                <p className="text-xs text-zinc-500">
                  Showing prefix for <span className="text-zinc-300">{keys[0].name}</span>. The full key was shown once at creation.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create key dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setCreatedKey(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="bg-[#0d0d14] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {createdKey ? "Key Created" : "Create API Key"}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {createdKey ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Your new API key is ready. You can copy it anytime from the
                key list.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-green-400 font-mono break-all">
                  {createdKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdKey, "created-key")}
                >
                  {copiedId === "created-key" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                Or copy the full config for{" "}
                <code className="text-zinc-400">.context/enterprise.yaml</code>:
              </p>
              <div className="relative group">
                <pre className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 pr-12 text-xs text-zinc-400 font-mono">
{buildEnterpriseConfigYaml(createdKey)}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    const yaml = buildEnterpriseConfigYaml(createdKey);
                    void copyToClipboard(yaml, "created-yaml");
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {copiedId === "created-yaml" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Key name (e.g., Production)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="bg-black/30 border-white/10"
              />
              <div>
                <p className="text-sm text-zinc-400 mb-2">Scopes</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SCOPES.map((scope) => {
                    const selected = newKeyScopes.includes(scope);
                    return (
                      <button
                        key={scope}
                        type="button"
                        onClick={() =>
                          setNewKeyScopes((prev) =>
                            selected
                              ? prev.filter((s) => s !== scope)
                              : [...prev, scope]
                          )
                        }
                        className="cursor-pointer"
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs transition-colors",
                            selected
                              ? "text-white border-white/20 bg-white/[0.06]"
                              : "text-zinc-500 border-white/10 bg-black/20"
                          )}
                        >
                          {selected && <Check className="mr-1 h-3 w-3" />}
                          {scope}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button
                onClick={createKey}
                className="w-full"
                disabled={newKeyScopes.length === 0}
              >
                Generate Key
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="border-white/10 bg-[#0d0d14] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Revoke API key?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently revoke{" "}
              <span className="font-medium text-zinc-300">
                {deleteTarget?.name}
              </span>{" "}
              <span className="font-mono text-zinc-500">
                ({deleteTarget?.keyPrefix}...)
              </span>
              . Any instances using this key will lose access.
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
              onClick={() => void confirmRevoke()}
              disabled={revoking}
            >
              {revoking ? "Revoking..." : "Revoke Key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
