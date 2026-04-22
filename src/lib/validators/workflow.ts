import { z } from "zod";

const SESSION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;

const workflowStateSchema = z
  .object({
    version: z.literal(1),
    updated_at: z.string().datetime(),
    phase: z.enum([
      "planning",
      "plan_review",
      "implementation_pending",
      "implementation",
      "iterating",
      "reviewed",
      "approved",
    ]),
    blocked_reasons: z
      .array(
        z.object({
          code: z.string().min(1).max(100),
          message: z.string().min(1).max(1000),
        })
      )
      .default([]),
    plan: z.object({
      title: z.string().max(200).nullable(),
      summary: z.string().max(5000).nullable(),
      tasks: z.array(z.string().max(500)).max(50),
      status: z.enum([
        "missing",
        "pending_review",
        "changes_requested",
        "approved",
      ]),
      updated_at: z.string().datetime().nullable(),
      reviewed_at: z.string().datetime().nullable(),
      review_notes: z.string().max(5000).nullable(),
    }),
    last_review: z.object({
      status: z.enum(["not_run", "failed", "passed"]),
      scope: z.enum(["all", "changed"]).nullable(),
      reviewed_at: z.string().datetime().nullable(),
      artifact_path: z.string().max(500).nullable(),
      summary: z
        .object({
          total: z.number().int().min(0).max(10_000),
          passed: z.number().int().min(0).max(10_000),
          failed: z.number().int().min(0).max(10_000),
          warnings: z.number().int().min(0).max(10_000),
        })
        .nullable(),
      failed_policies: z.array(z.string().max(200)).max(500),
      warning_policies: z.array(z.string().max(200)).max(500).default([]),
    }),
    approval: z.object({
      status: z.enum(["blocked", "ready", "approved"]),
      approved_at: z.string().datetime().nullable(),
      notes: z.string().max(5000).nullable(),
    }),
    notes: z
      .array(
        z.object({
          id: z.number().int().positive(),
          title: z.string().max(200),
          details: z.string().max(5000),
          created_at: z.string().datetime(),
        })
      )
      .max(500),
    todos: z
      .array(
        z.object({
          id: z.number().int().positive(),
          title: z.string().max(200),
          details: z.string().max(5000),
          status: z.enum(["open", "done"]),
          created_at: z.string().datetime(),
          updated_at: z.string().datetime(),
        })
      )
      .max(500),
    history: z
      .array(
        z.object({
          at: z.string().datetime(),
          event: z.string().min(1).max(100),
          details: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .max(100)
      .default([]),
  })
  .passthrough();

export const workflowPushSchema = z.object({
  repo: z.string().max(200).optional(),
  instance_id: z.string().max(64).regex(/^[a-f0-9]+$/).optional(),
  session_id: z.string().max(64).regex(SESSION_ID_RE).optional(),
  workflow: workflowStateSchema,
});

export type WorkflowPush = z.infer<typeof workflowPushSchema>;
