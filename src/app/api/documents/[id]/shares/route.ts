import { randomBytes } from "node:crypto";
import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

/** Active share links and collaborators. Owner only (enforced by RLS). */
export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [{ data: links, error: linkError }, { data: members, error: memberError }] = await Promise.all([
    supabase
      .from("share_links")
      .select("id, token, chapter_id, role, created_at")
      .eq("document_id", id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("document_members")
      .select("id, user_id, email, chapter_id, created_at")
      .eq("document_id", id)
      .order("created_at"),
  ]);
  if (linkError || memberError) {
    return NextResponse.json({ error: (linkError ?? memberError)!.message }, { status: 500 });
  }
  return NextResponse.json({ links: links ?? [], members: (members ?? []).filter((m) => m.user_id !== user.id) });
}

/** Create a link. Body: { role: "view" | "edit", chapterId?: string | null }. */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { role?: string; chapterId?: string | null };
  const role = body.role === "edit" ? "edit" : "view";

  const { data: link, error } = await supabase
    .from("share_links")
    .insert({
      token: randomBytes(24).toString("base64url"),
      document_id: id,
      chapter_id: body.chapterId || null,
      role,
      created_by: user.id,
    })
    .select("id, token, chapter_id, role, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(link);
}
