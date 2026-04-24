import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.CORTEX_HEARTBEAT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CORTEX_HEARTBEAT_API_KEY not set" },
      { status: 500 },
    );
  }

  const syncUrl = new URL("/api/v1/policies/sync", req.url);
  const res = await fetch(syncUrl, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      "x-cortex-instance-id": "heartbeat-vercel-cron",
    },
  });

  const body = (await res.json().catch(() => null)) as
    | { rules?: unknown[] }
    | null;

  return NextResponse.json(
    {
      ok: res.ok,
      status: res.status,
      rules: Array.isArray(body?.rules) ? body.rules.length : null,
    },
    { status: res.ok ? 200 : 502 },
  );
}
