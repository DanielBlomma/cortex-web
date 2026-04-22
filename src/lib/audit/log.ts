import { db } from "@/db";
import { auditLog } from "@/db/schema";

type AuditEntry = {
  orgId: string;
  userId?: string | null;
  apiKeyId?: string | null;
  apiKeyEnvironment?: string | null;
  source?: "web" | "client";
  action:
    | "create"
    | "update"
    | "delete"
    | "revoke"
    | "export"
    | "push"
    | "sync"
    | "ingest";
  eventType?: string | null;
  evidenceLevel?: "required" | "diagnostic";
  resourceType:
    | "policy"
    | "policy_sync"
    | "api_key"
    | "telemetry"
    | "workflow"
    | "review"
    | "violation"
    | "report"
    | "audit"
    | "context_tool"
    | "session";
  resourceId?: string | null;
  repo?: string | null;
  instanceId?: string | null;
  sessionId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
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
      apiKeyId: entry.apiKeyId ?? null,
      apiKeyEnvironment: entry.apiKeyEnvironment ?? null,
      source: entry.source ?? "web",
      action: entry.action,
      eventType: entry.eventType ?? null,
      evidenceLevel: entry.evidenceLevel ?? "diagnostic",
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      repo: entry.repo ?? null,
      instanceId: entry.instanceId ?? null,
      sessionId: entry.sessionId ?? null,
      description: entry.description,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      ipAddress,
      userAgent,
      occurredAt: entry.occurredAt ?? new Date(),
    })
    .catch((err) => {
      console.error("Audit log write failed:", err);
    });
}
