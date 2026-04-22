type AuditEntry = {
  evidenceLevel: string | null;
  source: string | null;
};

type AuditEvidenceTotals = {
  totalEvents?: number | null;
  requiredAuditEvents?: number | null;
  clientAuditEvents?: number | null;
};

export function summarizeAuditEvidence(
  auditEntries: AuditEntry[],
  totals: AuditEvidenceTotals = {}
) {
  return {
    totalEvents: Number(totals.totalEvents ?? auditEntries.length),
    requiredAuditEvents: Number(
      totals.requiredAuditEvents ??
        auditEntries.filter((entry) => entry.evidenceLevel === "required").length
    ),
    clientAuditEvents: Number(
      totals.clientAuditEvents ??
        auditEntries.filter((entry) => entry.source === "client").length
    ),
  };
}
