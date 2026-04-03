import { z } from "zod";

export const telemetryPushSchema = z.object({
  period_start: z.string(),
  period_end: z.string(),
  searches: z.number().int().min(0),
  related_lookups: z.number().int().min(0),
  rule_lookups: z.number().int().min(0),
  reloads: z.number().int().min(0),
  total_results_returned: z.number().int().min(0),
  estimated_tokens_saved: z.number().int().min(0),
});

export type TelemetryPush = z.infer<typeof telemetryPushSchema>;
