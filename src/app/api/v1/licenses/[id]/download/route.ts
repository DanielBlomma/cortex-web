import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { licenses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { signLicense } from "@/lib/licenses/sign";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id))
    return NextResponse.json({ error: "Invalid license ID" }, { status: 400 });

  const [license] = await db
    .select()
    .from(licenses)
    .where(and(eq(licenses.id, id), eq(licenses.orgId, orgId)));

  if (!license)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (license.status === "revoked")
    return NextResponse.json(
      { error: "License has been revoked" },
      { status: 403 }
    );

  try {
    const { encodedLicense } = signLicense({
      id: license.id,
      orgId: license.orgId,
      customer: license.customer,
      edition: license.edition,
      issuedAt: license.issuedAt,
      expiresAt: license.expiresAt,
      maxRepos: license.maxRepos,
      features: license.features,
    });

    return new Response(encodedLicense, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="license-${id}.lic"`,
      },
    });
  } catch (err) {
    console.error("License signing failed:", err);
    return NextResponse.json(
      { error: "License signing is not configured" },
      { status: 500 }
    );
  }
}
