import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bibleNotes } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;
  const body = await req.json();

  const [note] = await db
    .update(bibleNotes)
    .set(body)
    .where(and(eq(bibleNotes.id, noteId), eq(bibleNotes.userId, userId)))
    .returning();

  return NextResponse.json(note);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;

  await db
    .delete(bibleNotes)
    .where(and(eq(bibleNotes.id, noteId), eq(bibleNotes.userId, userId)));

  return NextResponse.json({ success: true });
}
