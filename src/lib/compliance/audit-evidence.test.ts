import { describe, expect, it } from "vitest";
import { summarizeAuditEvidence } from "./audit-evidence";

describe("summarizeAuditEvidence", () => {
  const sample = [
    { evidenceLevel: "required", source: "client" },
    { evidenceLevel: "diagnostic", source: "server" },
  ];

  it("falls back to sampled entries when aggregate totals are absent", () => {
    expect(summarizeAuditEvidence(sample)).toEqual({
      totalEvents: 2,
      requiredAuditEvents: 1,
      clientAuditEvents: 1,
    });
  });

  it("prefers aggregate totals over sampled rows", () => {
    expect(
      summarizeAuditEvidence(sample, {
        totalEvents: 1200,
        requiredAuditEvents: 700,
        clientAuditEvents: 900,
      })
    ).toEqual({
      totalEvents: 1200,
      requiredAuditEvents: 700,
      clientAuditEvents: 900,
    });
  });
});
