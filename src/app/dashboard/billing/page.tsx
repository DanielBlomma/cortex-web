import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage your subscription and payment details.
        </p>
      </div>
      <Card className="bg-white/[0.02] border-white/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Current Plan</CardTitle>
            <Badge variant="secondary">Free</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">
            Upgrade to Cloud for the hosted dashboard, central policy management,
            and analytics across all your teams.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
