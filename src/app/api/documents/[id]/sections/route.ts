import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documentSections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json([], { status: 401 });

  const { id } = await params;

  const sections = await db
    .select()
    .from(documentSections)
    .where(
      and(
        eq(documentSections.documentId, id),
        eq(documentSections.userId, userId),
        eq(documentSections.enabled, true),
      ),
    )
    .orderBy(documentSections.createdAt);

  return NextResponse.json(sections);
}

export async function POST(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [section] = await db
    .insert(documentSections)
    .values({
      documentId: id,
      userId,
      type: body.type,
      title: body.title ?? "",
      content: body.content ?? "",
      enabled: body.enabled ?? true,
    })
    .returning();

  return NextResponse.json(section);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [section] = await db
    .update(documentSections)
    .set({
      title: body.title,
      content: body.content,
      enabled: body.enabled,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentSections.id, body.sectionId),
        eq(documentSections.userId, userId),
      ),
    )
    .returning();

  return NextResponse.json(section);
}
