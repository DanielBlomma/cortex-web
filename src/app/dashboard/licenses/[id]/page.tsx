"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Ban } from "lucide-react";
import Link from "next/link";

type License = {
  id: string;
  customer: string;
  edition: string;
  issuedAt: string;
  expiresAt: string;
  maxRepos: number;
  features: string[];
  status: string;
  createdAt: string;
};

const statusStyle: Record<string, string> = {
  active: "",
  revoked: "text-red-400 border-red-400/20 bg-red-400/10",
  expired: "text-amber-400 border-amber-400/20 bg-amber-400/10",
};

export default function LicenseDetailPage() {
  const params = useParams();
  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);

  const fetchLicense = useCallback(async () => {
    const res = await fetch(`/api/v1/licenses/${params.id}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setLicense(data.license);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  const downloadLicense = async () => {
    const res = await fetch(`/api/v1/licenses/${params.id}/download`);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Download failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `license-${params.id}.lic`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const revokeLicense = async () => {
    if (!confirm("Revoke this license? This cannot be undone.")) return;
    setRevoking(true);
    await fetch(`/api/v1/licenses/${params.id}`, { method: "DELETE" });
    fetchLicense();
    setRevoking(false);
  };

  if (loading) {
    return <p className="text-zinc-500 text-sm p-6">Loading...</p>;
  }

  if (!license) {
    return <p className="text-zinc-500 text-sm p-6">License not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/licenses"
          className="text-sm text-zinc-500 hover:text-white flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Licenses
        </Link>
        <h1 className="text-2xl font-bold text-white">License Detail</h1>
      </div>

      <Card className="bg-white/[0.02] border-white/5">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center justify-between">
            {license.customer}
            <Badge
              variant="outline"
              className={`text-xs ${statusStyle[license.status] ?? ""}`}
            >
              {license.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">License ID</p>
              <p className="text-zinc-300 font-mono text-xs">{license.id}</p>
            </div>
            <div>
              <p className="text-zinc-500">Edition</p>
              <Badge variant="secondary" className="text-xs mt-1">
                {license.edition}
              </Badge>
            </div>
            <div>
              <p className="text-zinc-500">Issued</p>
              <p className="text-zinc-300">
                {new Date(license.issuedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Expires</p>
              <p className="text-zinc-300">
                {new Date(license.expiresAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Max Repos</p>
              <p className="text-zinc-300">{license.maxRepos}</p>
            </div>
            <div>
              <p className="text-zinc-500">Created</p>
              <p className="text-zinc-300">
                {new Date(license.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {license.features.length > 0 && (
            <div>
              <p className="text-zinc-500 text-sm mb-2">Features</p>
              <div className="flex flex-wrap gap-1">
                {license.features.map((f) => (
                  <Badge key={f} variant="secondary" className="text-xs">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t border-white/5">
            {license.status === "active" && (
              <>
                <Button size="sm" onClick={downloadLicense}>
                  <Download className="h-4 w-4 mr-2" />
                  Download License File
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={revokeLicense}
                  disabled={revoking}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {revoking ? "Revoking..." : "Revoke"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
