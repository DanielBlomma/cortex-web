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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

type License = {
  id: string;
  customer: string;
  edition: string;
  expiresAt: string;
  status: string;
  maxRepos: number;
  features: string[];
  createdAt: string;
};

const statusStyle: Record<string, string> = {
  active: "",
  revoked: "text-red-400 border-red-400/20 bg-red-400/10",
  expired: "text-amber-400 border-amber-400/20 bg-amber-400/10",
};

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchLicenses = useCallback(async () => {
    const params = filter !== "all" ? `?status=${filter}` : "";
    const res = await fetch(`/api/v1/licenses${params}`);
    const data = await res.json();
    setLicenses(data.licenses ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Licenses</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Signed license files for cortex-enterprise deployments.
          </p>
        </div>
        <Link href="/dashboard/licenses/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New License
          </Button>
        </Link>
      </div>

      <Tabs
        defaultValue="all"
        onValueChange={(v) => {
          setFilter(v);
          setLoading(true);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="revoked">Revoked</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="bg-white/[0.02] border-white/5">
        <CardHeader>
          <CardTitle className="text-white text-base">Licenses</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading...</p>
          ) : licenses.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              No licenses yet. Create your first license.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead className="text-zinc-400">Customer</TableHead>
                  <TableHead className="text-zinc-400">Edition</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Repos</TableHead>
                  <TableHead className="text-zinc-400">Expires</TableHead>
                  <TableHead className="text-zinc-400">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((lic) => (
                  <TableRow key={lic.id} className="border-white/5">
                    <TableCell>
                      <Link
                        href={`/dashboard/licenses/${lic.id}`}
                        className="text-white font-medium hover:underline"
                      >
                        {lic.customer}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {lic.edition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusStyle[lic.status] ?? ""}`}
                      >
                        {lic.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {lic.maxRepos}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {new Date(lic.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {new Date(lic.createdAt).toLocaleDateString()}
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
