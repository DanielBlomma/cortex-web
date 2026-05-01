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
};

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

export function signSnapshot(body: SnapshotBody, secret: string): SignedSnapshot {
  const payload = canonicalize(body);
  return {
    body,
    signature: `sha256=${computeHmac(payload, secret)}`,
    signature_algorithm: "HMAC-SHA256",
    signed_at: new Date().toISOString(),
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
  return lines.join("\n") + "\n";
}

export function buildEventsCsv(body: SnapshotBody): string {
  const lines: string[] = [];
  lines.push(csvRow(["category", "detected_at", "host_id", "cli", "description"]));
  for (const e of body.events) {
    lines.push(csvRow([e.category, e.detected_at, e.host_id, e.cli, e.description]));
  }
  return lines.join("\n") + "\n";
}

/**
 * Single multi-section CSV (RFC-4180-ish — many tools accept this; for stricter
 * tools, fetch hosts + events separately via the structured endpoints).
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
  ].join("\n");
  const events =
    body.events.length > 0
      ? "\n## Events (last 7d)\n\n" + buildEventsCsv(body)
      : "\n## Events (last 7d)\n\n(none)\n";
  return header + buildHostsCsv(body) + events;
}
