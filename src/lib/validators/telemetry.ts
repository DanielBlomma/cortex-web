import { z } from "zod";

export const telemetryPushSchema = z
  .object({
    period_start: z.string().datetime(),
    period_end: z.string().datetime(),
    searches: z.number().int().min(0).max(1_000_000),
    related_lookups: z.number().int().min(0).max(1_000_000),
    rule_lookups: z.number().int().min(0).max(1_000_000),
    reloads: z.number().int().min(0).max(1_000_000),
    total_results_returned: z.number().int().min(0).max(10_000_000),
    estimated_tokens_saved: z.number().int().min(0).max(100_000_000),
    estimated_tokens_total: z.number().int().min(0).max(100_000_000).optional(),
    client_version: z.string().max(50).optional(),
  })
  .refine((d) => new Date(d.period_end) > new Date(d.period_start), {
    message: "period_end must be after period_start",
  });

export type TelemetryPush = z.infer<typeof telemetryPushSchema>;
