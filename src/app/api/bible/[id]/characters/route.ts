import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters } from "@/lib/schema";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bibleId } = await params;
  const body = await req.json();

  const [char] = await db
    .insert(characters)
    .values({
      bibleId,
      userId,
      name: body.name ?? "New Character",
    })
    .returning();

  return NextResponse.json(char);
}
