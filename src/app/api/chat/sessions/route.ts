import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatSessions } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json([], { status: 401 });

  const url = new URL(req.url);
  const documentId = url.searchParams.get("documentId");
  if (!documentId) return NextResponse.json([]);

  const sessions = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.documentId, documentId),
        eq(chatSessions.userId, userId),
      ),
    )
    .orderBy(desc(chatSessions.updatedAt));

  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId, title } = await req.json();

  const [session] = await db
    .insert(chatSessions)
    .values({
      documentId,
      userId,
      title: title ?? "New Chat",
      messageCount: 0,
    })
    .returning();

  return NextResponse.json(session);
}
