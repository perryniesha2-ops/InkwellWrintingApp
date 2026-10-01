import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

interface Placement {
  id: string;
  parentId: string | null;
  orderIndex: number;
}

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { placements } = (await req.json()) as { placements: Placement[] };

  const results = await Promise.all(
    placements.map((p) =>
      supabase
        .from("chapters")
        .update({ parent_id: p.parentId, order_index: p.orderIndex })
        .eq("id", p.id)
        .eq("document_id", id),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
