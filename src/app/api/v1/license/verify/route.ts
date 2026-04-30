import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { licenses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { applyRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/v1/license/verify
 *
 * Cortex client-facing endpoint. Authenticated via Bearer API key.
 * Returns license validation result so the client can gate enterprise features.
 *
 * Response shape:
 *   200 + { valid: true, edition, features, expires_at, max_repos }      — license valid
 *   200 + { valid: false, reason: "..." }                                — denied (gracefully)
 *   401 + { error: "Missing API key" }                                   — auth header missing
 *   429                                                                  — rate limited
 *
 * Why 200 + valid:false instead of 4xx for denied: the client uses the
 * distinction between network failure and explicit denial to drive its
 * cache + grace-period logic. A network failure with a valid cached
 * license keeps enterprise active; an explicit deny degrades immediately.
 */

const requestSchema = z.object({
  instance_id: z.string().min(1).max(64).optional(),
  client_version: z.string().min(1).max(64).optional(),
});

type DenialReason =
  | "invalid_key"
  | "expired_key"
  | "revoked_key"
  | "no_license"
  | "expired_license"
  | "license_inactive";

function deny(reason: DenialReason) {
  return NextResponse.json({ valid: false, reason }, { status: 200 });
}

export async function POST(req: Request) {
  const rl = applyRateLimit(req, 60);
  if (rl) return rl;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  // Parse body (optional fields — client may send instance_id and version
  // for telemetry, but neither is required for validation itself).
  let body: z.infer<typeof requestSchema> = {};
  try {
    const raw = await req.json().catch(() => ({}));
    body = requestSchema.parse(raw);
  } catch {
    body = {};
  }

  const rawKey = authHeader.slice(7);
  const key = await verifyApiKey(rawKey);
  if (!key) {
    return deny("invalid_key");
  }

  const [license] = await db
    .select({
      edition: licenses.edition,
      features: licenses.features,
      expiresAt: licenses.expiresAt,
      maxRepos: licenses.maxRepos,
      status: licenses.status,
    })
    .from(licenses)
    .where(and(eq(licenses.orgId, key.orgId), eq(licenses.status, "active")))
    .limit(1);

  if (!license) {
    return deny("no_license");
  }

  if (license.status !== "active") {
    return deny("license_inactive");
  }

  const expiresAtDate = new Date(license.expiresAt);
  if (expiresAtDate < new Date()) {
    return deny("expired_license");
  }

  return NextResponse.json(
    {
      valid: true,
      edition: license.edition,
      features: license.features,
      expires_at: license.expiresAt,
      max_repos: license.maxRepos,
      // Echo back instance_id/client_version so the client can confirm
      // the response matches its request (helps with cache validation).
      instance_id: body.instance_id ?? null,
      client_version: body.client_version ?? null,
    },
    { status: 200 }
  );
}
