import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string; charId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { charId } = await params;
    const body = await req.json();

    // Remove any fields that don't exist in the schema
    const {
      id, bibleId, userId: _, createdAt,
      ...updateData
    } = body;


    const [char] = await db
      .update(characters)
      .set(updateData)
      .where(and(eq(characters.id, charId), eq(characters.userId, userId)))
      .returning();

    if (!char) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    return NextResponse.json(char);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update character", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { charId } = await params;

    await db
      .delete(characters)
      .where(and(eq(characters.id, charId), eq(characters.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete character", detail: String(err) },
      { status: 500 }
    );
  }
}