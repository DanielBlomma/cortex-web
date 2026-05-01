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
