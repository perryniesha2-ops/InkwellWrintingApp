import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bibleNotes } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { noteId } = await params;
    const body = await req.json();

    const {
      id, bibleId, userId: _, createdAt,
      ...updateData
    } = body;

    const [note] = await db
      .update(bibleNotes)
      .set(updateData)
      .where(and(eq(bibleNotes.id, noteId), eq(bibleNotes.userId, userId)))
      .returning();

    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(note);
  } catch (err) {
    console.error("Note update error:", err);
    return NextResponse.json({ error: "Failed to update", detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { noteId } = await params;
    await db.delete(bibleNotes)
      .where(and(eq(bibleNotes.id, noteId), eq(bibleNotes.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Note delete error:", err);
    return NextResponse.json({ error: "Failed to delete", detail: String(err) }, { status: 500 });
  }
}