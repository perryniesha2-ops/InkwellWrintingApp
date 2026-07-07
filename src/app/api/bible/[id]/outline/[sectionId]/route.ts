import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outlineSections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string; sectionId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;
  const body = await req.json();

  const [section] = await db
    .update(outlineSections)
    .set(body)
    .where(
      and(
        eq(outlineSections.id, sectionId),
        eq(outlineSections.userId, userId),
      ),
    )
    .returning();

  return NextResponse.json(section);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;

  await db
    .delete(outlineSections)
    .where(
      and(
        eq(outlineSections.id, sectionId),
        eq(outlineSections.userId, userId),
      ),
    );

  return NextResponse.json({ success: true });
}
