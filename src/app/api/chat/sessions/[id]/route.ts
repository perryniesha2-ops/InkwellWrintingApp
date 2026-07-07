import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages, chatSessions } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json([], { status: 401 });

  const { id } = await params;

  console.log("Loading messages for session:", id); // ← add this

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .orderBy(asc(chatMessages.createdAt));

  console.log("Found messages:", messages.length); // ← and this

  return NextResponse.json(messages);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  await db
    .update(chatSessions)
    .set({ updatedAt: new Date(), messageCount: body.messageCount })
    .where(eq(chatSessions.id, id));

  return NextResponse.json({ success: true });
}
