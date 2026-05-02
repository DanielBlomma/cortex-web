import { z } from "zod";

const SESSION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;
const TOOL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const REPO_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;

const telemetryToolMetricSchema = z.object({
  calls: z.number().int().min(0).max(10_000_000),
  failures: z.number().int().min(0).max(10_000_000),
  total_duration_ms: z.number().int().min(0).max(10_000_000_000),
  total_results_returned: z.number().int().min(0).max(100_000_000),
  estimated_tokens_saved: z.number().int().min(0).max(100_000_000),
});

export const telemetryPushSchema = z
  .object({
    period_start: z.string().datetime(),
    period_end: z.string().datetime(),
    total_tool_calls: z.number().int().min(0).max(10_000_000).optional(),
    successful_tool_calls: z.number().int().min(0).max(10_000_000).optional(),
    failed_tool_calls: z.number().int().min(0).max(10_000_000).optional(),
    total_duration_ms: z.number().int().min(0).max(10_000_000_000).optional(),
    session_starts: z.number().int().min(0).max(1_000_000).optional(),
    session_ends: z.number().int().min(0).max(1_000_000).optional(),
    session_duration_ms_total: z.number().int().min(0).max(10_000_000_000).optional(),
    searches: z.number().int().min(0).max(1_000_000),
    related_lookups: z.number().int().min(0).max(1_000_000),
    rule_lookups: z.number().int().min(0).max(1_000_000),
    reloads: z.number().int().min(0).max(1_000_000),
    caller_lookups: z.number().int().min(0).max(1_000_000).optional(),
    trace_lookups: z.number().int().min(0).max(1_000_000).optional(),
    impact_analyses: z.number().int().min(0).max(1_000_000).optional(),
    total_results_returned: z.number().int().min(0).max(10_000_000),
    estimated_tokens_saved: z.number().int().min(0).max(100_000_000),
    estimated_tokens_total: z.number().int().min(0).max(100_000_000).optional(),
    client_version: z.string().max(50).optional(),
    instance_id: z.string().max(64).regex(/^[a-f0-9]+$/).optional(),
    session_id: z.string().max(64).regex(SESSION_ID_RE).optional(),
    repo: z.string().max(200).regex(REPO_RE).optional(),
    tool_metrics: z
      .record(z.string().regex(TOOL_NAME_RE), telemetryToolMetricSchema)
      .optional(),
  })
  .strict()
  .refine((d) => new Date(d.period_end) >= new Date(d.period_start), {
    message: "period_end must not be before period_start",
  })
  .superRefine((data, ctx) => {
    if (data.tool_metrics && Object.keys(data.tool_metrics).length > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["tool_metrics"],
        message: "tool_metrics must not contain more than 100 tool buckets",
      });
    }

    const successes = data.successful_tool_calls ?? 0;
    const failures = data.failed_tool_calls ?? 0;
    const totalCalls = data.total_tool_calls ?? successes + failures;
    if (successes + failures > totalCalls) {
      ctx.addIssue({
        code: "custom",
        path: ["total_tool_calls"],
        message:
          "total_tool_calls must be greater than or equal to successful_tool_calls + failed_tool_calls",
      });
    }

    const estimatedTotal = data.estimated_tokens_total ?? 0;
    if (estimatedTotal > 0 && estimatedTotal < data.estimated_tokens_saved) {
      ctx.addIssue({
        code: "custom",
        path: ["estimated_tokens_total"],
        message:
          "estimated_tokens_total must be greater than or equal to estimated_tokens_saved",
      });
    }

    if (data.tool_metrics) {
      const aggregate = Object.values(data.tool_metrics).reduce(
        (acc, bucket) => {
          acc.calls += bucket.calls;
          acc.failures += bucket.failures;
          acc.totalDurationMs += bucket.total_duration_ms;
          acc.totalResultsReturned += bucket.total_results_returned;
          acc.estimatedTokensSaved += bucket.estimated_tokens_saved;
          return acc;
        },
        {
          calls: 0,
          failures: 0,
          totalDurationMs: 0,
          totalResultsReturned: 0,
          estimatedTokensSaved: 0,
        },
      );

      if (data.total_tool_calls !== undefined && aggregate.calls > data.total_tool_calls) {
        ctx.addIssue({
          code: "custom",
          path: ["tool_metrics"],
          message: "tool_metrics calls must not exceed total_tool_calls",
        });
      }

      if (data.failed_tool_calls !== undefined && aggregate.failures > data.failed_tool_calls) {
        ctx.addIssue({
          code: "custom",
          path: ["tool_metrics"],
          message: "tool_metrics failures must not exceed failed_tool_calls",
        });
      }

      if (
        data.total_duration_ms !== undefined &&
        aggregate.totalDurationMs > data.total_duration_ms
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["tool_metrics"],
          message: "tool_metrics duration must not exceed total_duration_ms",
        });
      }

      if (aggregate.totalResultsReturned > data.total_results_returned) {
        ctx.addIssue({
          code: "custom",
          path: ["tool_metrics"],
          message:
            "tool_metrics returned results must not exceed total_results_returned",
        });
      }

      if (aggregate.estimatedTokensSaved > data.estimated_tokens_saved) {
        ctx.addIssue({
          code: "custom",
          path: ["tool_metrics"],
          message:
            "tool_metrics estimated tokens saved must not exceed estimated_tokens_saved",
        });
      }
    }
  });

export type TelemetryPush = z.infer<typeof telemetryPushSchema>;
