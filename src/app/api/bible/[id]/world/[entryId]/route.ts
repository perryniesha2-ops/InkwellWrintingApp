import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { worldEntries } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string; entryId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { entryId } = await params;
    const body = await req.json();

    const {
      id, bibleId, userId: _, createdAt,
      ...updateData
    } = body;

    const [entry] = await db
      .update(worldEntries)
      .set(updateData)
      .where(and(eq(worldEntries.id, entryId), eq(worldEntries.userId, userId)))
      .returning();

    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(entry);
  } catch (err) {
    console.error("World entry update error:", err);
    return NextResponse.json({ error: "Failed to update", detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { entryId } = await params;
    await db.delete(worldEntries)
      .where(and(eq(worldEntries.id, entryId), eq(worldEntries.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("World entry delete error:", err);
    return NextResponse.json({ error: "Failed to delete", detail: String(err) }, { status: 500 });
  }
}