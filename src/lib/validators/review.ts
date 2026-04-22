import { z } from "zod";

const SESSION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;

const reviewItem = z.object({
  policy_id: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9][a-z0-9\-:]*$/, "Policy ID must be lowercase alphanumeric with hyphens/colons"),
  pass: z.boolean(),
  severity: z.enum(["error", "warning", "info"]).default("info"),
  message: z.string().max(2000).default(""),
  detail: z.string().max(5000).optional(),
  reviewed_at: z.string().datetime(),
});

export const reviewPushSchema = z.object({
  repo: z.string().max(200).optional(),
  instance_id: z.string().max(64).regex(/^[a-f0-9]+$/).optional(),
  session_id: z.string().max(64).regex(SESSION_ID_RE).optional(),
  reviews: z.array(reviewItem).min(1).max(100),
});

export type ReviewPush = z.infer<typeof reviewPushSchema>;
