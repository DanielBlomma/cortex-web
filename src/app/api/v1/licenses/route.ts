import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { licenses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createLicenseSchema } from "@/lib/validators/license";

export async function GET(req: Request) {
  const { orgId } = await auth();
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const conditions = [eq(licenses.orgId, orgId)];
  if (status && ["active", "expired", "revoked"].includes(status)) {
    conditions.push(eq(licenses.status, status));
  }

  const rows = await db
    .select()
    .from(licenses)
    .where(and(...conditions))
    .orderBy(licenses.createdAt);

  return NextResponse.json({ licenses: rows });
}

export async function POST(req: Request) {
  const { orgId, userId } = await auth();
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createLicenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [license] = await db
    .insert(licenses)
    .values({
      orgId,
      ...parsed.data,
      createdBy: userId,
    })
    .returning();

  return NextResponse.json({ license }, { status: 201 });
}
