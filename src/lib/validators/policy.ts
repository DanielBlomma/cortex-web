import { z } from "zod";

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
});

export const updatePolicySchema = z.object({
  description: z.string().max(1000).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  scope: z.string().min(1).max(200).optional(),
  enforce: z.boolean().optional(),
});
