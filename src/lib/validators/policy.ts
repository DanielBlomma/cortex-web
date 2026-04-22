import { z } from "zod";

// Known evaluator types in cortex-enterprise. Extending this list must be
// paired with a corresponding evaluator registration in the plugin.
const evaluatorTypeSchema = z
  .enum(["regex", "license", "dep_audit", "prompt_injection", "code_comments"])
  .or(z.string().min(1).max(100));

const evaluatorConfigSchema = z.record(z.string(), z.unknown());
const policyKindSchema = z.enum(["predefined", "custom"]);
const policyStatusSchema = z.enum(["draft", "active", "disabled", "archived"]);
const policySeveritySchema = z.enum(["info", "warning", "error", "block"]);

export const createPolicySchema = z.object({
  title: z.string().min(1).max(200).default("Untitled Policy"),
  ruleId: z
    .string()
    .min(1)
    .max(200)
    .regex(
      /^[a-z0-9][a-z0-9\-:]*$/,
      "Rule ID must be lowercase alphanumeric with hyphens/colons"
    ),
  description: z.string().max(1000).default(""),
  kind: policyKindSchema.optional(),
  status: policyStatusSchema.default("active"),
  severity: policySeveritySchema.default("block"),
  priority: z.number().int().min(0).max(100).default(50),
  scope: z.string().min(1).max(200).default("global"),
  enforce: z.boolean().default(true),
  type: evaluatorTypeSchema.nullable().optional(),
  config: evaluatorConfigSchema.nullable().optional(),
});

export const updatePolicySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: policyStatusSchema.optional(),
  severity: policySeveritySchema.optional(),
  priority: z.number().int().min(0).max(100).optional(),
  scope: z.string().min(1).max(200).optional(),
  enforce: z.boolean().optional(),
  type: evaluatorTypeSchema.nullable().optional(),
  config: evaluatorConfigSchema.nullable().optional(),
});
