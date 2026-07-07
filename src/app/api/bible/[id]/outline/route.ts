import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outlineSections } from "@/lib/schema";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bibleId } = await params;
  const body = await req.json();

  const [section] = await db
    .insert(outlineSections)
    .values({
      bibleId,
      userId,
      title: body.title ?? "New Chapter",
      type: body.type ?? "chapter",
      orderIndex: body.orderIndex ?? 0,
    })
    .returning();

  return NextResponse.json(section);
}
