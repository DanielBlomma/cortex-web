import { z } from "zod";

const isoDateTimeSchema = z.string().datetime({ offset: true });
const metadataSchema = z.record(z.string(), z.unknown());
const DISALLOWED_KEY_RE =
  /^(?:query|prompt|content|code|diff|patch|body|text|embedding|embeddings|graph|raw_query|raw_prompt|raw_code|raw_content)$/i;

function isRedactedSummary(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as Record<string, unknown>).redacted === true,
  );
}

function containsDisallowedKeys(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((item) => containsDisallowedKeys(item));
  }
  return Object.entries(value as Record<string, unknown>).some(
    ([key, item]) =>
      (DISALLOWED_KEY_RE.test(key) && !isRedactedSummary(item)) ||
      containsDisallowedKeys(item)
  );
}

export const auditEventSchema = z.object({
  timestamp: isoDateTimeSchema,
  tool: z.string().min(1).max(200),
  input: z.record(z.string(), z.unknown()).default({}),
  result_count: z.number().int().min(0).max(1_000_000),
  entities_returned: z.array(z.string().max(500)).max(500).default([]),
  rules_applied: z.array(z.string().max(200)).max(500).default([]),
  duration_ms: z.number().int().min(0).max(86_400_000),
  status: z.enum(["success", "error"]).optional(),
  error: z.string().max(5000).optional(),
  event_type: z
    .enum([
      "tool_call",
      "workflow_transition",
      "review_result",
      "policy_sync",
      "approval",
      "session",
      "security_scan",
    ])
    .optional(),
  evidence_level: z.enum(["required", "diagnostic"]).optional(),
  resource_type: z.string().min(1).max(100).optional(),
  resource_id: z.string().max(200).optional(),
  repo: z.string().min(1).max(200).optional(),
  instance_id: z.string().min(1).max(200).optional(),
  session_id: z.string().min(1).max(200).optional(),
  metadata: metadataSchema.optional(),
}).strict()
  .refine((value) => !containsDisallowedKeys(value.input), {
    message: "audit input contains disallowed raw content keys",
    path: ["input"],
  })
  .refine((value) => !containsDisallowedKeys(value.metadata), {
    message: "audit metadata contains disallowed raw content keys",
    path: ["metadata"],
  });

export const auditPushSchema = z.object({
  repo: z.string().min(1).max(200).optional(),
  instance_id: z.string().min(1).max(200).optional(),
  session_id: z.string().min(1).max(200).optional(),
  events: z.array(auditEventSchema).min(1).max(100),
}).strict();
