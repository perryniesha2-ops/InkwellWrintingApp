import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/schema";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { messages } = await req.json();

  await db.insert(chatMessages).values(
    (messages as { role: string; content: string }[]).map((m) => ({
      sessionId: id,
      userId,
      role: m.role,
      content: m.content,
    })),
  );

  return NextResponse.json({ success: true });
}
