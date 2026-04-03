import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Policies</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Organization-wide rules that sync to all connected instances.
          </p>
        </div>
        <Link href="/dashboard/policies/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Policy
          </Button>
        </Link>
      </div>
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
        <p className="text-zinc-500">No policies yet. Create your first policy.</p>
      </div>
    </div>
  );
}
