export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Telemetry data across all connected instances.
        </p>
      </div>
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
        <p className="text-zinc-500">
          No telemetry data yet. Connect an instance to start seeing analytics.
        </p>
      </div>
    </div>
  );
}
