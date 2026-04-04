import { db } from "@/db";
import { auditLog } from "@/db/schema";

type AuditEntry = {
  orgId: string;
  userId?: string | null;
  action: "create" | "update" | "delete" | "revoke" | "export";
  resourceType: "policy" | "api_key" | "violation" | "report";
  resourceId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  req?: Request;
};

export function logAudit(entry: AuditEntry) {
  const ipAddress =
    entry.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    entry.req?.headers.get("x-real-ip") ??
    null;
  const userAgent = entry.req?.headers.get("user-agent") ?? null;

  // Fire-and-forget — audit logging should not block the request
  db.insert(auditLog)
    .values({
      orgId: entry.orgId,
      userId: entry.userId ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      description: entry.description,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      ipAddress,
      userAgent,
    })
    .catch((err) => {
      console.error("Audit log write failed:", err);
    });
}
