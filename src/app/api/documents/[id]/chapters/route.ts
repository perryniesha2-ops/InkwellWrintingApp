import { createServerClient } from "@/lib/supabase/server";
import { CHAPTER_COLUMNS, splitHtmlIntoChapters } from "@/lib/chapters";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Claim the one-time seed atomically; only the request that flips the flag seeds.
  const { data: claimed } = await supabase
    .from("documents")
    .update({ chapters_seeded: true })
    .eq("id", id)
    .eq("chapters_seeded", false)
    .select("content")
    .maybeSingle();

  if (claimed) {
    const seeds = splitHtmlIntoChapters(claimed.content ?? "");
    const ids = seeds.map(() => crypto.randomUUID());
    const sibling = new Map<number | null, number>();
    const rows = seeds.map((s, i) => {
      const order = sibling.get(s.parentIndex) ?? 0;
      sibling.set(s.parentIndex, order + 1);
      return {
        id: ids[i],
        document_id: id,
        user_id: user.id,
        parent_id: s.parentIndex === null ? null : ids[s.parentIndex],
        title: s.title,
        content: s.content,
        order_index: order,
      };
    });
    // Parents first so the parent_id foreign key is satisfied.
    const { error: topErr } = await supabase.from("chapters").insert(rows.filter((r) => !r.parent_id));
    const children = rows.filter((r) => r.parent_id);
    const { error: childErr } = children.length
      ? await supabase.from("chapters").insert(children)
      : { error: null };
    if (topErr || childErr) {
      await supabase.from("documents").update({ chapters_seeded: false }).eq("id", id);
      return NextResponse.json({ error: (topErr ?? childErr)!.message }, { status: 500 });
    }
  }

  const select = () =>
    supabase.from("chapters").select(CHAPTER_COLUMNS).eq("document_id", id).order("order_index");

  let { data: chapters, error } = await select();
  // Lost the seeding race: give the winner a moment to finish inserting.
  if (!claimed && !error && chapters?.length === 0) {
    await new Promise((r) => setTimeout(r, 600));
    ({ data: chapters, error } = await select());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(chapters ?? []);
}

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    title?: string;
    content?: string;
    parentId?: string | null;
    orderIndex?: number;
    guidance?: string;
  };

  const { data: chapter, error } = await supabase
    .from("chapters")
    .insert({
      document_id: id,
      user_id: user.id,
      parent_id: body.parentId ?? null,
      title: body.title ?? "Untitled Chapter",
      content: body.content ?? "",
      guidance: body.guidance ?? "",
      order_index: body.orderIndex ?? 0,
    })
    .select(CHAPTER_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(chapter);
}
