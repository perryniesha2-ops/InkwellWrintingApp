import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

interface Character {
  name: string;
  role: string | null;
  traits: string[] | null;
  hair: string | null;
  eyes: string | null;
  height_build: string | null;
}

interface OutlineSection {
  title: string;
  type: string | null;
  content: string | null;
  order_index: number | null;
}

interface WorldEntry {
  title: string;
  category: string | null;
  content: string | null;
}

export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: bible } = await supabase
    .from("story_bibles")
    .select("*")
    .eq("document_id", id)
    .single();

  if (!bible) return NextResponse.json({ context: "" });

  const [
    { data: chars },
    { data: outline },
    { data: world },
  ] = await Promise.all([
    supabase.from("characters").select("name, role, traits, hair, eyes, height_build").eq("bible_id", bible.id),
    supabase.from("outline_sections").select("title, type, content, order_index").eq("bible_id", bible.id).order("order_index"),
    supabase.from("world_entries").select("title, category, content").eq("bible_id", bible.id),
  ]);

  const sections: string[] = [];

  if (chars && chars.length > 0) {
    const charText = (chars as Character[]).map((c) => {
      const parts = [`- ${c.name}`];
      if (c.role) parts.push(`(${c.role})`);
      if (c.traits?.length) parts.push(`Traits: ${c.traits.join(", ")}`);
      if (c.hair) parts.push(`Hair: ${c.hair}`);
      if (c.eyes) parts.push(`Eyes: ${c.eyes}`);
      return parts.join(" | ");
    }).join("\n");
    sections.push(`CHARACTERS:\n${charText}`);
  }

  if (outline && outline.length > 0) {
    const outlineText = (outline as OutlineSection[]).map((s) =>
      `- ${s.type ?? "section"} ${(s.order_index ?? 0) + 1}: ${s.title}${s.content ? ` — ${s.content.slice(0, 100)}` : ""}`
    ).join("\n");
    sections.push(`STORY OUTLINE:\n${outlineText}`);
  }

  if (world && world.length > 0) {
    const worldText = (world as WorldEntry[]).map((w) =>
      `- ${w.title} (${w.category ?? "general"})${w.content ? `: ${w.content.slice(0, 150)}` : ""}`
    ).join("\n");
    sections.push(`WORLD BUILDING:\n${worldText}`);
  }

  const context = sections.length > 0
    ? `STORY BIBLE:\n${"─".repeat(40)}\n${sections.join("\n\n")}\n${"─".repeat(40)}`
    : "";

  return NextResponse.json({ context });
}