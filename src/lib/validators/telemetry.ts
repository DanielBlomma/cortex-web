import { z } from "zod";

const SESSION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;

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
    tool_metrics: z
      .record(
        z.string(),
        z.object({
          calls: z.number().int().min(0).max(10_000_000),
          failures: z.number().int().min(0).max(10_000_000),
          total_duration_ms: z.number().int().min(0).max(10_000_000_000),
          total_results_returned: z.number().int().min(0).max(100_000_000),
          estimated_tokens_saved: z.number().int().min(0).max(100_000_000),
        })
      )
      .optional(),
  })
  .strict()
  .refine((d) => new Date(d.period_end) >= new Date(d.period_start), {
    message: "period_end must not be before period_start",
  });

export type TelemetryPush = z.infer<typeof telemetryPushSchema>;
