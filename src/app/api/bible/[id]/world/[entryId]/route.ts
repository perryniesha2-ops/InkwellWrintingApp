import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { worldEntries } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string; entryId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await params;
  const body = await req.json();

  const [entry] = await db
    .update(worldEntries)
    .set(body)
    .where(and(eq(worldEntries.id, entryId), eq(worldEntries.userId, userId)))
    .returning();

  return NextResponse.json(entry);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await params;

  await db
    .delete(worldEntries)
    .where(and(eq(worldEntries.id, entryId), eq(worldEntries.userId, userId)));

  return NextResponse.json({ success: true });
}
