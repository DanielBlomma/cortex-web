"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EDITION_OPTIONS, FEATURE_OPTIONS } from "@/lib/validators/license";

export default function NewLicensePage() {
  const router = useRouter();
  const [customer, setCustomer] = useState("");
  const [edition, setEdition] = useState<string>("connected");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxRepos, setMaxRepos] = useState(10);
  const [features, setFeatures] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (f: string) => {
    setFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/v1/licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, edition, expiresAt, maxRepos, features }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create license");
      setSubmitting(false);
      return;
    }
    const data = await res.json();
    router.push(`/dashboard/licenses/${data.license.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/licenses"
          className="text-sm text-zinc-500 hover:text-white flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Licenses
        </Link>
        <h1 className="text-2xl font-bold text-white">Create License</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Generate a new signed license file.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Card className="bg-white/[0.02] border-white/5">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-zinc-300">Customer Name</Label>
              <Input
                placeholder="Acme Corp"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="bg-black/30 border-white/10 mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-zinc-300">Edition</Label>
              <div className="flex gap-2 mt-1">
                {EDITION_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setEdition(opt)}
                    className="cursor-pointer"
                  >
                    <Badge
                      variant={edition === opt ? "default" : "outline"}
                      className="text-sm px-3 py-1"
                    >
                      {opt}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Expires At</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="bg-black/30 border-white/10 mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-zinc-300">Max Repos</Label>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={maxRepos}
                  onChange={(e) => setMaxRepos(Number(e.target.value))}
                  className="bg-black/30 border-white/10 mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-zinc-300">Features</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {FEATURE_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFeature(f)}
                    className="cursor-pointer"
                  >
                    <Badge
                      variant={features.includes(f) ? "default" : "outline"}
                      className="text-sm px-3 py-1"
                    >
                      {f}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Creating..." : "Create License"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
