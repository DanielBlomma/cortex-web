import { z } from "zod";

const SESSION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;

const violationItem = z.object({
  rule_id: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9][a-z0-9\-:]*$/, "Rule ID must be lowercase alphanumeric with hyphens/colons"),
  severity: z.enum(["error", "warning", "info"]).default("warning"),
  message: z.string().max(2000).default(""),
  file_path: z.string().max(500).optional(),
  metadata: z.string().max(5000).optional(),
  occurred_at: z.string().datetime(),
});

export const violationPushSchema = z.object({
  repo: z.string().max(200).optional(),
  instance_id: z.string().max(64).regex(/^[a-f0-9]+$/).optional(),
  session_id: z.string().max(64).regex(SESSION_ID_RE).optional(),
  violations: z.array(violationItem).min(1).max(100),
});

export type ViolationPush = z.infer<typeof violationPushSchema>;
