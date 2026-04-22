import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { UUID_RE } from "@/lib/validators/uuid";
import { getOwnerId } from "@/lib/auth/owner";
import { logAudit } from "@/lib/audit/log";
import { applyRateLimit } from "@/lib/rate-limit";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = applyRateLimit(_req, 20);
  if (rl) return rl;

  const owner = await getOwnerId();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (owner.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can revoke API keys" },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid key ID" }, { status: 400 });
  }

  const [key] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.orgId, owner.ownerId)))
    .returning({ id: apiKeys.id, name: apiKeys.name });

  if (!key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  logAudit({
    orgId: owner.ownerId,
    userId: owner.userId,
    action: "revoke",
    resourceType: "api_key",
    resourceId: id,
    description: `Revoked API key "${key.name}"`,
    req: _req,
  });

  return NextResponse.json({ ok: true });
}
