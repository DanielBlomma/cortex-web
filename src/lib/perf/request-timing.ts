import { NextResponse } from "next/server";

type RequestTimingStep = {
  name: string;
  durationMs: number;
};

function sanitizeMetricName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function formatDuration(durationMs: number): string {
  return durationMs.toFixed(1);
}

export function createRequestTiming() {
  const startedAt = performance.now();
  const steps: RequestTimingStep[] = [];

  async function timeStep<T>(
    name: string,
    operation: () => Promise<T> | T,
  ): Promise<T> {
    const stepStartedAt = performance.now();

    try {
      return await operation();
    } finally {
      steps.push({
        name,
        durationMs: performance.now() - stepStartedAt,
      });
    }
  }

  function totalDurationMs(): number {
    return performance.now() - startedAt;
  }

  function serverTimingHeader(): string {
    const metrics = [
      `total;dur=${formatDuration(totalDurationMs())}`,
      ...steps.map(
        (step) =>
          `${sanitizeMetricName(step.name)};dur=${formatDuration(step.durationMs)}`,
      ),
    ];

    return metrics.join(", ");
  }

  function attach<T extends NextResponse>(response: T): T {
    response.headers.set("Server-Timing", serverTimingHeader());
    response.headers.set("x-cortex-total-ms", formatDuration(totalDurationMs()));
    response.headers.set("x-cortex-step-count", String(steps.length));
    return response;
  }

  return {
    attach,
    timeStep,
  };
}
