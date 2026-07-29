import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { messages } = await req.json();

  const { error } = await supabase
    .from("chat_messages")
    .insert(
      (messages as { role: string; content: string }[]).map((m) => ({
        session_id: id,
        user_id: user.id,
        role: m.role,
        content: m.content,
      }))
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}