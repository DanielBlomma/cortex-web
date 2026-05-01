import { createHash } from "crypto";
import { computeHmac } from "@/lib/hmac";

/**
 * Govern compliance snapshot — the canonical artifact a revisor receives.
 *
 * The same shape underlies CSV, signed JSON and the printable HTML report,
 * so that all three views describe identical content. The signed JSON
 * carries an HMAC over the canonical-JSON of the snapshot body, so a
 * revisor can verify the artefact wasn't altered in transit.
 */

export type SnapshotHost = {
  host_id: string;
  os: string;
  os_version: string | null;
  govern_mode: "off" | "advisory" | "enforced";
  ai_clis_detected: Array<{ name: string; tier: string; version?: string; last_seen?: string }>;
  active_frameworks: string[];
  config_version: string | null;
  first_seen: string | null;
  last_seen: string | null;
};

export type SnapshotEvent = {
  category: "tamper" | "ungoverned" | "apply";
  detected_at: string;
  host_id: string;
  cli: string;
  description: string;
};

export type SnapshotBody = {
  schema_version: 1;
  generated_at: string;
  org_id: string;
  totals: {
    hosts: number;
    enforced: number;
    advisory: number;
    off: number;
    tamper_7d: number;
    ungoverned_7d: number;
    apply_success_7d: number;
    apply_failure_7d: number;
  };
  hosts: SnapshotHost[];
  events: SnapshotEvent[];
};

export type SignedSnapshot = {
  body: SnapshotBody;
  signature: string;
  signature_algorithm: "HMAC-SHA256";
  signed_at: string;
  /**
   * Identifier of the key used to compute `signature`. Lets a verifier pick
   * the right secret when multiple are in rotation. Either the explicit
   * value of `CORTEX_SNAPSHOT_SIGNING_KEY_ID` or, as a fallback, an
   * 8-char SHA-256 fingerprint derived from the secret itself.
   */
  key_id: string;
};

/**
 * Derive a short, non-reversible fingerprint of the signing secret, used as
 * the `key_id` when no explicit identifier is configured.
 */
export function deriveKeyIdFromSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 8);
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = sortKeys(obj[key]);
  }
  return out;
}

/**
 * Canonical JSON serialization with recursively-sorted keys so the
 * same snapshot input always produces the same bytes signed,
 * regardless of property insertion order at any level.
 */
export function canonicalize(body: SnapshotBody): string {
  return JSON.stringify(sortKeys(body));
}

export function signSnapshot(
  body: SnapshotBody,
  secret: string,
  keyId?: string,
): SignedSnapshot {
  const payload = canonicalize(body);
  return {
    body,
    signature: `sha256=${computeHmac(payload, secret)}`,
    signature_algorithm: "HMAC-SHA256",
    signed_at: new Date().toISOString(),
    key_id: keyId && keyId.trim() !== "" ? keyId : deriveKeyIdFromSecret(secret),
  };
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(",");
}

/**
 * RFC-4180 mandates CRLF as the row separator. Many parsers accept LF,
 * but the strict ones (Excel, some BI tools) won't, so we always emit CRLF.
 */
const CRLF = "\r\n";

export function buildHostsCsv(body: SnapshotBody): string {
  const lines: string[] = [];
  lines.push(
    csvRow([
      "host_id",
      "os",
      "os_version",
      "govern_mode",
      "ai_clis",
      "active_frameworks",
      "config_version",
      "first_seen",
      "last_seen",
    ]),
  );
  for (const h of body.hosts) {
    lines.push(
      csvRow([
        h.host_id,
        h.os,
        h.os_version ?? "",
        h.govern_mode,
        h.ai_clis_detected.map((c) => `${c.name}:${c.tier}`).join(";"),
        h.active_frameworks.join(";"),
        h.config_version ?? "",
        h.first_seen ?? "",
        h.last_seen ?? "",
      ]),
    );
  }
  return lines.join(CRLF) + CRLF;
}

export function buildEventsCsv(body: SnapshotBody): string {
  const lines: string[] = [];
  lines.push(csvRow(["category", "detected_at", "host_id", "cli", "description"]));
  for (const e of body.events) {
    lines.push(csvRow([e.category, e.detected_at, e.host_id, e.cli, e.description]));
  }
  return lines.join(CRLF) + CRLF;
}

/**
 * Pure RFC-4180 CSV containing only the hosts table. Used when callers
 * pass `?part=hosts`, so strict parsers (Excel etc) get a single-section
 * file with no `#` comments and no multi-table mixing.
 */
export function buildHostsCsvOnly(body: SnapshotBody): string {
  return buildHostsCsv(body);
}

/**
 * Pure RFC-4180 CSV containing only the events table. Used when callers
 * pass `?part=events`.
 */
export function buildEventsCsvOnly(body: SnapshotBody): string {
  return buildEventsCsv(body);
}

/**
 * Single multi-section CSV (RFC-4180-ish — many tools accept this; for stricter
 * tools, callers can request `?part=hosts` or `?part=events` to get a clean
 * single-table CSV instead).
 */
export function buildCombinedCsv(body: SnapshotBody): string {
  const header = [
    `# Cortex Govern Snapshot`,
    `# generated_at,${body.generated_at}`,
    `# org_id,${body.org_id}`,
    `# schema_version,${body.schema_version}`,
    `# totals: hosts=${body.totals.hosts} enforced=${body.totals.enforced} advisory=${body.totals.advisory} off=${body.totals.off}`,
    `# 7d: tamper=${body.totals.tamper_7d} ungoverned=${body.totals.ungoverned_7d} apply_ok=${body.totals.apply_success_7d} apply_fail=${body.totals.apply_failure_7d}`,
    "",
    "## Hosts",
    "",
  ].join(CRLF);
  const events =
    body.events.length > 0
      ? CRLF + "## Events (last 7d)" + CRLF + CRLF + buildEventsCsv(body)
      : CRLF + "## Events (last 7d)" + CRLF + CRLF + "(none)" + CRLF;
  return header + buildHostsCsv(body) + events;
}
