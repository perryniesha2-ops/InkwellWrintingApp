import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
      genre: documents.genre,
      wordCount: documents.wordCount,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.updatedAt));

  return NextResponse.json(docs);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      title: body.title ?? "Untitled",
      content: body.content ?? "",
      genre: body.genre ?? null,
      wordCount: 0,
    })
    .returning();

  return NextResponse.json(doc);
}
