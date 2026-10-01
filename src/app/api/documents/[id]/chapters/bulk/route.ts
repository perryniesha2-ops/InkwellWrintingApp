import { createServerClient } from "@/lib/supabase/server";
import { CHAPTER_COLUMNS } from "@/lib/chapters";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

interface NewChapter {
  title: string;
  content?: string;
  guidance?: string;
  children?: { title: string; content?: string; guidance?: string }[];
}

/**
 * Append a batch of chapters (with optional subchapters) after the existing
 * ones — used when applying an outline template or importing a .docx. If `replaceChapterId` is an
 * empty chapter with no subchapters (a fresh book's blank "Chapter 1"), it is
 * removed so the template isn't preceded by an empty chapter.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { chapters, replaceChapterId } = (await req.json()) as {
    chapters: NewChapter[];
    replaceChapterId?: string;
  };
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return NextResponse.json({ error: "No chapters given" }, { status: 400 });
  }

  const { data: existing, error: loadError } = await supabase
    .from("chapters")
    .select("id, parent_id, content, order_index")
    .eq("document_id", id);
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });

  let removedId: string | null = null;
  const replace = existing?.find((c) => c.id === replaceChapterId);
  if (
    replace &&
    !replace.parent_id &&
    !replace.content.replace(/<[^>]+>/g, "").trim() &&
    !existing!.some((c) => c.parent_id === replace.id)
  ) {
    removedId = replace.id;
  }

  const startIndex =
    Math.max(-1, ...(existing ?? []).filter((c) => !c.parent_id && c.id !== removedId).map((c) => c.order_index)) + 1;

  const parents = chapters.map((c, i) => ({
    id: crypto.randomUUID(),
    document_id: id,
    user_id: user.id,
    parent_id: null,
    title: c.title,
    content: c.content ?? "",
    guidance: c.guidance ?? "",
    order_index: startIndex + i,
  }));
  const children = chapters.flatMap((c, i) =>
    (c.children ?? []).map((child, j) => ({
      document_id: id,
      user_id: user.id,
      parent_id: parents[i].id,
      title: child.title,
      content: child.content ?? "",
      guidance: child.guidance ?? "",
      order_index: j,
    })),
  );

  const { data: insertedParents, error: parentError } = await supabase
    .from("chapters").insert(parents).select(CHAPTER_COLUMNS);
  if (parentError) return NextResponse.json({ error: parentError.message }, { status: 500 });

  const { data: insertedChildren, error: childError } = children.length
    ? await supabase.from("chapters").insert(children).select(CHAPTER_COLUMNS)
    : { data: [], error: null };
  if (childError) return NextResponse.json({ error: childError.message }, { status: 500 });

  if (removedId) await supabase.from("chapters").delete().eq("id", removedId).eq("document_id", id);

  return NextResponse.json({
    created: [...(insertedParents ?? []), ...(insertedChildren ?? [])],
    removedId,
  });
}
