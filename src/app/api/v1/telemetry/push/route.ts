import { NextResponse } from "next/server";
import { db } from "@/db";
import { telemetryEvents } from "@/db/schema";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { telemetryPushSchema } from "@/lib/validators/telemetry";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rl = applyRateLimit(req, 60);
  if (rl) return rl;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const rawKey = authHeader.slice(7);
  const key = await verifyApiKey(rawKey);
  if (!key) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!key.scopes?.includes("telemetry")) {
    return NextResponse.json(
      { error: "Key does not have telemetry scope" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = telemetryPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  await db.insert(telemetryEvents).values({
    orgId: key.orgId,
    apiKeyId: key.id,
    periodStart: new Date(data.period_start),
    periodEnd: new Date(data.period_end),
    searches: data.searches,
    relatedLookups: data.related_lookups,
    ruleLookups: data.rule_lookups,
    reloads: data.reloads,
    totalResultsReturned: data.total_results_returned,
    estimatedTokensSaved: data.estimated_tokens_saved,
    estimatedTokensTotal: data.estimated_tokens_total ?? 0,
    clientVersion: data.client_version ?? null,
  });

  return NextResponse.json({ ok: true });
}
