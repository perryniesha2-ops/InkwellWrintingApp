import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json() as Record<string, unknown>;

    // Strip read-only fields
    const { id: _id, userId: _userId, createdAt: _createdAt, ...rest } = body;

    // Build update object — only include fields present in request
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if ("title" in rest)      updateData.title      = rest.title;
    if ("content" in rest)    updateData.content    = rest.content;
    if ("genre" in rest)      updateData.genre      = rest.genre ?? null;
    if ("wordCount" in rest)  updateData.wordCount  = rest.wordCount ?? 0;
    if ("coverImage" in rest) updateData.coverImage = rest.coverImage ?? null;

    const [doc] = await db
      .update(documents)
      .set(updateData)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .returning();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (err) {
    console.error("Document PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update document", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Document DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete document", detail: String(err) },
      { status: 500 }
    );
  }
}