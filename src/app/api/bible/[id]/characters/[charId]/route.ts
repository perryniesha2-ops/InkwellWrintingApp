import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string; charId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { charId } = await params;
  const body = await req.json();

  const [char] = await db
    .update(characters)
    .set(body)
    .where(and(eq(characters.id, charId), eq(characters.userId, userId)))
    .returning();

  return NextResponse.json(char);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { charId } = await params;

  await db
    .delete(characters)
    .where(and(eq(characters.id, charId), eq(characters.userId, userId)));

  return NextResponse.json({ success: true });
}
