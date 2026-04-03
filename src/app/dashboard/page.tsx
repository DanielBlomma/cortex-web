import { BarChart3, Search, Zap, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { title: "Total Searches", value: "—", icon: Search },
  { title: "Tokens Saved", value: "—", icon: Zap },
  { title: "Active Instances", value: "—", icon: Users },
  { title: "Policies Active", value: "—", icon: BarChart3 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Your organization&apos;s Cortex usage at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="bg-white/[0.02] border-white/5"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-zinc-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <p className="text-xs text-zinc-500 mt-1">
                Connect an instance to see data
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
