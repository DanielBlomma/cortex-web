import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { policies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updatePolicySchema } from "@/lib/validators/policy";

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
    return NextResponse.json({ error: "Invalid policy ID" }, { status: 400 });

  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.id, id), eq(policies.orgId, orgId)));

  if (!policy)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ policy });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id))
    return NextResponse.json({ error: "Invalid policy ID" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updatePolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [policy] = await db
    .update(policies)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(policies.id, id), eq(policies.orgId, orgId)))
    .returning();

  if (!policy)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ policy });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id))
    return NextResponse.json({ error: "Invalid policy ID" }, { status: 400 });

  const [policy] = await db
    .delete(policies)
    .where(and(eq(policies.id, id), eq(policies.orgId, orgId)))
    .returning({ id: policies.id });

  if (!policy)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
