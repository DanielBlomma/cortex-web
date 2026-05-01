import { describe, it, expect } from "vitest";
import {
  buildCombinedCsv,
  buildEventsCsv,
  buildEventsCsvOnly,
  buildHostsCsv,
  buildHostsCsvOnly,
  canonicalize,
  deriveKeyIdFromSecret,
  signSnapshot,
  type SnapshotBody,
} from "./snapshot";
import { verifyHmac } from "@/lib/hmac";

function fixture(overrides: Partial<SnapshotBody> = {}): SnapshotBody {
  return {
    schema_version: 1,
    generated_at: "2026-05-01T12:00:00.000Z",
    org_id: "org_test_123",
    totals: {
      hosts: 2,
      enforced: 1,
      advisory: 1,
      off: 0,
      tamper_7d: 1,
      ungoverned_7d: 2,
      apply_success_7d: 5,
      apply_failure_7d: 0,
    },
    hosts: [
      {
        host_id: "alice-mbp",
        os: "darwin",
        os_version: "25.3",
        govern_mode: "enforced",
        ai_clis_detected: [
          { name: "claude", tier: "prevent" },
          { name: "copilot", tier: "wrap", last_seen: "2026-05-01T11:55:00.000Z" },
        ],
        active_frameworks: ["iso27001", "soc2"],
        config_version: "abc123def456",
        first_seen: "2026-04-29T08:00:00.000Z",
        last_seen: "2026-05-01T11:55:00.000Z",
      },
      {
        host_id: "bob-laptop",
        os: "linux",
        os_version: null,
        govern_mode: "advisory",
        ai_clis_detected: [],
        active_frameworks: ["iso27001"],
        config_version: null,
        first_seen: "2026-04-30T10:00:00.000Z",
        last_seen: "2026-05-01T10:00:00.000Z",
      },
    ],
    events: [
      {
        category: "tamper",
        detected_at: "2026-05-01T11:00:00.000Z",
        host_id: "alice-mbp",
        cli: "claude",
        description: "hook PreToolUse silent",
      },
      {
        category: "ungoverned",
        detected_at: "2026-05-01T10:30:00.000Z",
        host_id: "bob-laptop",
        cli: "copilot",
        description: "/usr/local/bin/copilot (action=logged)",
      },
    ],
    ...overrides,
  };
}

describe("canonicalize", () => {
  it("is deterministic for the same body", () => {
    const a = canonicalize(fixture());
    const b = canonicalize(fixture());
    expect(a).toBe(b);
  });

  it("changes when any field changes", () => {
    const a = canonicalize(fixture());
    const b = canonicalize(fixture({ totals: { ...fixture().totals, hosts: 3 } }));
    expect(a).not.toBe(b);
  });
});

describe("signSnapshot", () => {
  const SECRET = "0".repeat(64);

  it("produces a verifiable HMAC-SHA256 signature", () => {
    const signed = signSnapshot(fixture(), SECRET);
    expect(signed.signature_algorithm).toBe("HMAC-SHA256");
    expect(signed.signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    const ok = verifyHmac(canonicalize(signed.body), SECRET, signed.signature);
    expect(ok).toBe(true);
  });

  it("a tampered body fails verification", () => {
    const signed = signSnapshot(fixture(), SECRET);
    const tampered = { ...signed.body, totals: { ...signed.body.totals, enforced: 99 } };
    const ok = verifyHmac(canonicalize(tampered), SECRET, signed.signature);
    expect(ok).toBe(false);
  });

  it("a wrong secret fails verification", () => {
    const signed = signSnapshot(fixture(), SECRET);
    const ok = verifyHmac(canonicalize(signed.body), "1".repeat(64), signed.signature);
    expect(ok).toBe(false);
  });

  it("includes a key_id derived from the secret when no explicit id is given", () => {
    const signed = signSnapshot(fixture(), SECRET);
    // 8-char hex fingerprint as documented; deterministic per secret.
    expect(signed.key_id).toMatch(/^[a-f0-9]{8}$/);
    expect(signed.key_id).toBe(deriveKeyIdFromSecret(SECRET));
    // A different secret yields a different fingerprint.
    const otherSigned = signSnapshot(fixture(), "1".repeat(64));
    expect(otherSigned.key_id).not.toBe(signed.key_id);
  });

  it("uses the explicit keyId when provided", () => {
    const signed = signSnapshot(fixture(), SECRET, "rot-2026-q2");
    expect(signed.key_id).toBe("rot-2026-q2");
  });

  it("falls back to fingerprint when the explicit keyId is empty", () => {
    const signed = signSnapshot(fixture(), SECRET, "  ");
    expect(signed.key_id).toBe(deriveKeyIdFromSecret(SECRET));
  });

  it("round-trips: caller can re-canonicalize and re-verify the signed body", () => {
    const signed = signSnapshot(fixture(), SECRET, "rot-2026-q2");
    // Simulates a verifier receiving the JSON over the wire.
    const wire = JSON.parse(JSON.stringify(signed));
    expect(wire.key_id).toBe("rot-2026-q2");
    expect(wire.signature_algorithm).toBe("HMAC-SHA256");
    const ok = verifyHmac(canonicalize(wire.body), SECRET, wire.signature);
    expect(ok).toBe(true);
  });
});

describe("buildHostsCsv", () => {
  it("emits a header row plus one row per host with semicolon-separated multi-values", () => {
    const csv = buildHostsCsv(fixture());
    const lines = csv.trim().split(/\r?\n/);
    expect(lines[0]).toBe(
      "host_id,os,os_version,govern_mode,ai_clis,active_frameworks,config_version,first_seen,last_seen",
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("alice-mbp");
    expect(lines[1]).toContain("claude:prevent;copilot:wrap");
    expect(lines[1]).toContain("iso27001;soc2");
  });

  it("uses CRLF line endings per RFC-4180", () => {
    const csv = buildHostsCsv(fixture());
    // Every separator is CRLF, including the trailing one.
    expect(csv.endsWith("\r\n")).toBe(true);
    // No bare LF (each LF is preceded by CR).
    const bareLF = csv.match(/(?<!\r)\n/g);
    expect(bareLF).toBe(null);
  });

  it("escapes commas/quotes/newlines correctly", () => {
    const body = fixture({
      hosts: [
        {
          host_id: 'host,with"weird,quotes',
          os: "darwin",
          os_version: null,
          govern_mode: "off",
          ai_clis_detected: [],
          active_frameworks: [],
          config_version: null,
          first_seen: null,
          last_seen: null,
        },
      ],
    });
    const csv = buildHostsCsv(body);
    expect(csv).toContain('"host,with""weird,quotes"');
  });
});

describe("buildEventsCsv", () => {
  it("emits a header plus one row per event", () => {
    const csv = buildEventsCsv(fixture());
    const lines = csv.trim().split(/\r?\n/);
    expect(lines[0]).toBe("category,detected_at,host_id,cli,description");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("tamper");
    expect(lines[2]).toContain("ungoverned");
  });

  it("uses CRLF line endings per RFC-4180", () => {
    const csv = buildEventsCsv(fixture());
    expect(csv.endsWith("\r\n")).toBe(true);
    const bareLF = csv.match(/(?<!\r)\n/g);
    expect(bareLF).toBe(null);
  });
});

describe("buildHostsCsvOnly / buildEventsCsvOnly", () => {
  it("hosts-only is strict RFC-4180: no #-comments, no section markers, CRLF", () => {
    const csv = buildHostsCsvOnly(fixture());
    expect(csv).not.toMatch(/^#/m);
    expect(csv).not.toContain("##");
    // Single header line followed by data rows separated by CRLF.
    expect(csv.startsWith("host_id,os,os_version")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("events-only is strict RFC-4180: no #-comments, no section markers, CRLF", () => {
    const csv = buildEventsCsvOnly(fixture());
    expect(csv).not.toMatch(/^#/m);
    expect(csv).not.toContain("##");
    expect(csv.startsWith("category,detected_at,host_id")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

describe("buildCombinedCsv", () => {
  it("starts with comment headers including totals", () => {
    const csv = buildCombinedCsv(fixture());
    expect(csv).toMatch(/^# Cortex Govern Snapshot/);
    expect(csv).toMatch(/# generated_at,2026-05-01T12:00:00\.000Z/);
    expect(csv).toMatch(/totals: hosts=2 enforced=1 advisory=1 off=0/);
  });

  it("uses CRLF line endings throughout", () => {
    const csv = buildCombinedCsv(fixture());
    expect(csv.endsWith("\r\n")).toBe(true);
    const bareLF = csv.match(/(?<!\r)\n/g);
    expect(bareLF).toBe(null);
  });

  it("includes hosts and events sections", () => {
    const csv = buildCombinedCsv(fixture());
    expect(csv).toContain("## Hosts");
    expect(csv).toContain("## Events");
    expect(csv).toContain("alice-mbp");
    expect(csv).toContain("tamper");
  });

  it("'(none)' when there are no events", () => {
    const csv = buildCombinedCsv(fixture({ events: [] }));
    expect(csv).toContain("## Events (last 7d)\r\n\r\n(none)");
  });
});
