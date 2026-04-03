"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Copy, Trash2, Check } from "lucide-react";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName || "Default" }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to create key");
      return;
    }

    const data = await res.json();
    setCreatedKey(data.key.rawKey);
    setNewKeyName("");
    fetchKeys();
  };

  const revokeKey = async (id: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await fetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
    fetchKeys();
  };

  const copyKey = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">API Keys</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Keys used by cortex-enterprise instances for telemetry and policy
            sync.
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setCreatedKey(null);
          }}
        >
          <DialogTrigger>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0d0d14] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">
                {createdKey ? "Key Created" : "Create API Key"}
              </DialogTitle>
            </DialogHeader>

            {createdKey ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Copy this key now. You won&apos;t be able to see it again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-green-400 font-mono break-all">
                    {createdKey}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyKey}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-zinc-500 font-mono">
                  Add to .context/enterprise.yaml:
                </p>
                <pre className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-400 font-mono">
{`telemetry:
  api_key: "${createdKey}"
policy:
  api_key: "${createdKey}"`}
                </pre>
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  placeholder="Key name (e.g., Production)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="bg-black/30 border-white/10"
                />
                <Button onClick={createKey} className="w-full">
                  Generate Key
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
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
                    <TableCell className="font-mono text-zinc-500 text-xs">
                      {key.keyPrefix}...
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
                        ? new Date(key.lastUsedAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revokeKey(key.id)}
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
    </div>
  );
}
