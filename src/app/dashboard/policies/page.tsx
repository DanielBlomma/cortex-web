"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Policy = {
  id: string;
  ruleId: string;
  description: string;
  priority: number;
  scope: string;
  enforce: boolean;
  createdAt: string;
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolicies = useCallback(async () => {
    const res = await fetch("/api/v1/policies");
    const data = await res.json();
    setPolicies(data.policies ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const toggleEnforce = async (id: string, current: boolean) => {
    await fetch(`/api/v1/policies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enforce: !current }),
    });
    fetchPolicies();
  };

  const deletePolicy = async (id: string) => {
    if (!confirm("Delete this policy? This cannot be undone.")) return;
    await fetch(`/api/v1/policies/${id}`, { method: "DELETE" });
    fetchPolicies();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Policies</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Organization-wide rules enforced by cortex-enterprise instances.
          </p>
        </div>
        <Link href="/dashboard/policies/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Policy
          </Button>
        </Link>
      </div>

      <Card className="bg-white/[0.02] border-white/5">
        <CardHeader>
          <CardTitle className="text-white text-base">Active Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading...</p>
          ) : policies.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              No policies yet. Create your first policy.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead className="text-zinc-400">Rule</TableHead>
                  <TableHead className="text-zinc-400">Description</TableHead>
                  <TableHead className="text-zinc-400">Priority</TableHead>
                  <TableHead className="text-zinc-400">Scope</TableHead>
                  <TableHead className="text-zinc-400">Enforce</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={p.id} className="border-white/5">
                    <TableCell className="font-mono text-white text-sm">
                      {p.ruleId}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm max-w-xs truncate">
                      {p.description}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.priority >= 80 ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {p.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {p.scope}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleEnforce(p.id, p.enforce)}
                        className="cursor-pointer"
                      >
                        <Badge
                          variant={p.enforce ? "default" : "outline"}
                          className="text-xs"
                        >
                          {p.enforce ? "Enforced" : "Disabled"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/dashboard/policies/${p.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-zinc-500 hover:text-white"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deletePolicy(p.id)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
