import { z } from "zod";
import { FRAMEWORK_IDS, GOVERN_CLIS } from "@/lib/govern/types";

const cliSchema = z.enum(GOVERN_CLIS);
const frameworkSchema = z.enum(FRAMEWORK_IDS);

export const governAppliedSchema = z.object({
  host_id: z.string().min(1).max(256),
  instance_id: z.string().min(1).max(128).optional(),
  cli: cliSchema,
  version: z.string().min(8).max(128),
  source: z.enum(["session_start", "periodic_sync", "manual"]),
  success: z.boolean(),
  error_message: z.string().max(1024).optional(),
});

export const governHeartbeatSchema = z.object({
  host_id: z.string().min(1).max(256),
  os: z.enum(["darwin", "linux", "windows"]),
  os_version: z.string().max(64).optional(),
  govern_mode: z.enum(["off", "advisory", "enforced"]),
  active_frameworks: z.array(frameworkSchema).default([]),
  config_version: z.string().max(128).nullable().optional(),
  ai_clis_detected: z
    .array(
      z.object({
        name: z.string().max(64),
        tier: z.enum(["prevent", "wrap", "detect", "off"]),
        version: z.string().max(64).optional(),
        last_seen: z.string().datetime().optional(),
      }),
    )
    .default([]),
});

export type GovernAppliedPayload = z.infer<typeof governAppliedSchema>;
export type GovernHeartbeatPayload = z.infer<typeof governHeartbeatSchema>;

export const ungovernedEventSchema = z.object({
  detected_at: z.string().datetime(),
  host_id: z.string().min(1).max(256),
  cli: z.string().min(1).max(64),
  binary_path: z.string().min(1).max(1024),
  args: z.unknown().optional(),
  sys_user: z.string().max(128).optional(),
  parent_pid: z.number().int().min(0).optional(),
  pid: z.number().int().min(0).optional(),
  action_taken: z
    .enum(["logged", "sigterm", "skipped_cross_user", "none"])
    .default("logged"),
});

export const ungovernedReportSchema = z.object({
  events: z.array(ungovernedEventSchema).min(1).max(500),
});

export const hookTamperEventSchema = z.object({
  detected_at: z.string().datetime(),
  host_id: z.string().min(1).max(256),
  cli: cliSchema,
  hook_name: z.string().min(1).max(64),
  session_id: z.string().max(128).optional(),
  last_seen: z.string().datetime().nullable().optional(),
  missing_seconds: z.number().int().min(0).optional(),
});

export const hookTamperReportSchema = z.object({
  events: z.array(hookTamperEventSchema).min(1).max(500),
});

export type UngovernedReportPayload = z.infer<typeof ungovernedReportSchema>;
export type HookTamperReportPayload = z.infer<typeof hookTamperReportSchema>;
