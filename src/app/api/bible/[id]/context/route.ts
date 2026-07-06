import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  storyBibles,
  characters,
  outlineSections,
  worldEntries,
  bibleNotes,
} from "@/lib/schema";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

function formatBibleContext(data: {
  characters: { name: string; role: string | null; traits: string[] | null }[];
  outline: {
    title: string;
    type: string | null;
    content: string | null;
    orderIndex: number | null;
  }[];
  worldEntries: {
    title: string;
    category: string | null;
    content: string | null;
  }[];
  notes: { title: string; content: string | null }[];
}): string {
  const sections: string[] = [];

  if (data.characters.length > 0) {
    const chars = data.characters
      .map((c) => {
        const parts = [`- ${c.name}`];
        if (c.role) parts.push(`(${c.role})`);
        if (c.traits?.length) parts.push(`Traits: ${c.traits.join(", ")}`);
        return parts.join(" | ");
      })
      .join("\n");
    sections.push(`CHARACTERS:\n${chars}`);
  }

  if (data.outline.length > 0) {
    const outline = data.outline
      .map(
        (s) =>
          `- ${s.type ?? "section"} ${(s.orderIndex ?? 0) + 1}: ${s.title}${s.content ? ` — ${s.content.slice(0, 100)}` : ""}`,
      )
      .join("\n");
    sections.push(`STORY OUTLINE:\n${outline}`);
  }

  if (data.worldEntries.length > 0) {
    const world = data.worldEntries
      .map(
        (w) =>
          `- ${w.title} (${w.category ?? "general"})${w.content ? `: ${w.content.slice(0, 150)}` : ""}`,
      )
      .join("\n");
    sections.push(`WORLD BUILDING:\n${world}`);
  }

  return sections.length > 0
    ? `STORY BIBLE:\n${"─".repeat(40)}\n${sections.join("\n\n")}\n${"─".repeat(40)}`
    : "";
}

export async function GET(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [bible] = await db
    .select()
    .from(storyBibles)
    .where(eq(storyBibles.documentId, id));

  if (!bible) return NextResponse.json({ context: "" });

  const [chars, outline, world, notes] = await Promise.all([
    db.select().from(characters).where(eq(characters.bibleId, bible.id)),
    db
      .select()
      .from(outlineSections)
      .where(eq(outlineSections.bibleId, bible.id)),
    db.select().from(worldEntries).where(eq(worldEntries.bibleId, bible.id)),
    db.select().from(bibleNotes).where(eq(bibleNotes.bibleId, bible.id)),
  ]);

  const context = formatBibleContext({
    characters: chars as {
      name: string;
      role: string | null;
      traits: string[] | null;
    }[],
    outline: outline as {
      title: string;
      type: string | null;
      content: string | null;
      orderIndex: number | null;
    }[],
    worldEntries: world as {
      title: string;
      category: string | null;
      content: string | null;
    }[],
    notes: notes as { title: string; content: string | null }[],
  });

  return NextResponse.json({ context });
}
