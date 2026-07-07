import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  storyBibles,
  characters,
  outlineSections,
  worldEntries,
  bibleNotes,
  documents,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Get or create bible
  let [bible] = await db
    .select()
    .from(storyBibles)
    .where(eq(storyBibles.documentId, id));

  if (!bible) {
    [bible] = await db
      .insert(storyBibles)
      .values({ documentId: id, userId })
      .returning();
  }

  const [doc] = await db
    .select({ title: documents.title })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));

  const [chars, outline, world, notes] = await Promise.all([
    db.select().from(characters).where(eq(characters.bibleId, bible.id)),
    db
      .select()
      .from(outlineSections)
      .where(eq(outlineSections.bibleId, bible.id)),
    db.select().from(worldEntries).where(eq(worldEntries.bibleId, bible.id)),
    db.select().from(bibleNotes).where(eq(bibleNotes.bibleId, bible.id)),
  ]);

  return NextResponse.json({
    bible,
    characters: chars,
    outline,
    world,
    notes,
    docTitle: doc?.title ?? "Your Story",
  });
}
