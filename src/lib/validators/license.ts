import { z } from "zod";

export const EDITION_OPTIONS = [
  "connected",
  "air-gapped",
  "enterprise",
] as const;

export const FEATURE_OPTIONS = [
  "telemetry",
  "policy-sync",
  "audit-log",
  "custom-rules",
  "sso",
] as const;

export const createLicenseSchema = z.object({
  customer: z.string().min(1).max(200),
  edition: z.enum(EDITION_OPTIONS).default("connected"),
  expiresAt: z.string().date("Must be a valid date (YYYY-MM-DD)"),
  maxRepos: z.number().int().min(1).max(10000).default(10),
  features: z.array(z.enum(FEATURE_OPTIONS)).default([]),
});
