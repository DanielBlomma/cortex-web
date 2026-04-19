import { z } from "zod";

// Known evaluator types in cortex-enterprise. Extending this list must be
// paired with a corresponding evaluator registration in the plugin.
const evaluatorTypeSchema = z
  .enum(["regex", "license", "dep_audit", "prompt_injection", "code_comments"])
  .or(z.string().min(1).max(100));

const evaluatorConfigSchema = z.record(z.string(), z.unknown());

export const createPolicySchema = z.object({
  ruleId: z
    .string()
    .min(1)
    .max(200)
    .regex(
      /^[a-z0-9][a-z0-9\-:]*$/,
      "Rule ID must be lowercase alphanumeric with hyphens/colons"
    ),
  description: z.string().max(1000).default(""),
  priority: z.number().int().min(0).max(100).default(50),
  scope: z.string().min(1).max(200).default("global"),
  enforce: z.boolean().default(true),
  type: evaluatorTypeSchema.nullable().optional(),
  config: evaluatorConfigSchema.nullable().optional(),
});

export const updatePolicySchema = z.object({
  description: z.string().max(1000).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  scope: z.string().min(1).max(200).optional(),
  enforce: z.boolean().optional(),
  type: evaluatorTypeSchema.nullable().optional(),
  config: evaluatorConfigSchema.nullable().optional(),
});
