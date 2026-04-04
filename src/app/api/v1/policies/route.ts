import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { policies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPolicySchema } from "@/lib/validators/policy";

export async function GET() {
  const { orgId } = await auth();
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(policies)
    .where(eq(policies.orgId, orgId))
    .orderBy(policies.priority);

  return NextResponse.json({ policies: rows });
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

  const parsed = createPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const [policy] = await db
      .insert(policies)
      .values({
        orgId,
        ...parsed.data,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json({ policy }, { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A policy with this rule ID already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}
