import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outlineSections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string; sectionId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sectionId } = await params;
    const body = await req.json();

    const {
      id, bibleId, userId: _, createdAt,
      ...updateData
    } = body;

    const [section] = await db
      .update(outlineSections)
      .set(updateData)
      .where(and(eq(outlineSections.id, sectionId), eq(outlineSections.userId, userId)))
      .returning();

    if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(section);
  } catch (err) {
    console.error("Outline update error:", err);
    return NextResponse.json({ error: "Failed to update", detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sectionId } = await params;
    await db.delete(outlineSections)
      .where(and(eq(outlineSections.id, sectionId), eq(outlineSections.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Outline delete error:", err);
    return NextResponse.json({ error: "Failed to delete", detail: String(err) }, { status: 500 });
  }
}