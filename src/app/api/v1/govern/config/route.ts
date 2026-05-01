import { NextResponse } from "next/server";
import { db } from "@/db";
import { frameworkBundle, governConfigVersion } from "@/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";
import { verifyApiKey } from "@/lib/api-keys/verify";
import { applyRateLimit } from "@/lib/rate-limit";
import { ensureRuntimeSchema } from "@/lib/db/ensure-runtime-schema";
import { ensureDefaultFrameworkBundles } from "@/lib/govern/default-bundles";
import { mergeBundles } from "@/lib/govern/merge-bundles";
import {
  isFrameworkId,
  isGovernCli,
  type FrameworkBundlePayload,
  type FrameworkId,
  type GovernCli,
} from "@/lib/govern/types";

/**
 * GET /api/v1/govern/config?cli=<claude|codex|copilot>&frameworks=<csv>
 *
 * Returns merged managed-settings + deny-rules + tamper-config for the requested CLI,
 * built from the latest version of each requested framework_bundle.
 *
 * Supports If-None-Match → 304 to avoid re-fetching unchanged config.
 */
export async function GET(req: Request) {
  await ensureRuntimeSchema();
  await ensureDefaultFrameworkBundles();
  const rl = applyRateLimit(req, 30);
  if (rl) return rl;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }
  const key = await verifyApiKey(authHeader.slice(7));
  if (!key) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  if (!key.scopes?.includes("govern")) {
    return NextResponse.json({ error: "Key does not have govern scope" }, { status: 403 });
  }

  const url = new URL(req.url);
  const cliParam = url.searchParams.get("cli");
  if (!cliParam || !isGovernCli(cliParam)) {
    return NextResponse.json(
      { error: "cli must be one of: claude, codex, copilot" },
      { status: 400 },
    );
  }
  const cli: GovernCli = cliParam;

  const frameworksParam = url.searchParams.get("frameworks") ?? "";
  const requested = frameworksParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const frameworks: FrameworkId[] = [];
  for (const f of requested) {
    if (isFrameworkId(f)) frameworks.push(f);
  }
  if (frameworks.length === 0) {
    return NextResponse.json(
      { error: "frameworks must list at least one valid framework" },
      { status: 400 },
    );
  }

  const rows = await db
    .select({
      frameworkId: frameworkBundle.frameworkId,
      version: frameworkBundle.version,
      managedSettings: frameworkBundle.managedSettings,
      denyRules: frameworkBundle.denyRules,
      tamperConfig: frameworkBundle.tamperConfig,
      createdAt: frameworkBundle.createdAt,
    })
    .from(frameworkBundle)
    .where(inArray(frameworkBundle.frameworkId, frameworks))
    .orderBy(frameworkBundle.frameworkId, desc(frameworkBundle.createdAt));

  const latestPerFramework = new Map<FrameworkId, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestPerFramework.has(row.frameworkId as FrameworkId)) {
      latestPerFramework.set(row.frameworkId as FrameworkId, row);
    }
  }

  const bundles = Array.from(latestPerFramework.values()).map((r) => ({
    framework_id: r.frameworkId as FrameworkId,
    version: r.version,
    payload: {
      managed_settings: r.managedSettings,
      deny_rules: r.denyRules,
      tamper_config: r.tamperConfig,
    } as FrameworkBundlePayload,
  }));

  if (bundles.length === 0) {
    return NextResponse.json(
      { error: "No bundles found for requested frameworks", requested: frameworks },
      { status: 404 },
    );
  }

  const { config, version } = mergeBundles(bundles, cli);
  const etag = `"${version}"`;

  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  await db
    .insert(governConfigVersion)
    .values({
      orgId: key.orgId,
      cli,
      version,
      frameworks: config.frameworks,
      mergedConfig: config,
    })
    .onConflictDoNothing({
      target: [governConfigVersion.orgId, governConfigVersion.cli, governConfigVersion.version],
    });

  return NextResponse.json(config, {
    status: 200,
    headers: { ETag: etag, "Cache-Control": "private, must-revalidate" },
  });
}
