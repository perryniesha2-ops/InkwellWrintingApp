import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { EVENT_LIMITS, MAX_IMPORT_EVENTS, TIMELINE_TYPES, type TimelineType } from "@/lib/timelineImport";

type RouteParams = { params: Promise<{ id: string }> };

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * Add many timeline events at once, from a document the author imported.
 * Body: { events: ImportedEvent[], replace?: boolean }. With replace, the
 * Story Bible's existing events are removed once the new ones are saved.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bibleId } = await params;
  const body = (await req.json().catch(() => ({}))) as { events?: unknown; replace?: unknown };
  if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > MAX_IMPORT_EVENTS) {
    return NextResponse.json({ error: `Send between 1 and ${MAX_IMPORT_EVENTS} events.` }, { status: 400 });
  }
  const replace = body.replace === true;

  const { data: existing, error: readError } = await supabase
    .from("timeline_events")
    .select("id, order_index")
    .eq("bible_id", bibleId);
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  const start = replace ? 0 : Math.max(-1, ...(existing ?? []).map((e) => Number(e.order_index) || 0)) + 1;

  const rows = (body.events as Record<string, unknown>[]).map((e, i) => {
    const title = text(e.title, EVENT_LIMITS.title) || text(e.timeLabel, EVENT_LIMITS.title) || "Event";
    return {
      bible_id: bibleId,
      user_id: user.id,
      order_index: start + i,
      time_label: text(e.timeLabel, EVENT_LIMITS.timeLabel),
      title,
      description: text(e.description, EVENT_LIMITS.description),
      chapter_ref: text(e.chapterRef, EVENT_LIMITS.chapterRef),
      location: text(e.location, EVENT_LIMITS.location),
      characters: Array.isArray(e.characters)
        ? e.characters.map((c) => text(c, EVENT_LIMITS.character)).filter(Boolean).slice(0, EVENT_LIMITS.characters)
        : [],
      type: TIMELINE_TYPES.includes(e.type as TimelineType) ? e.type : "event",
    };
  });

  // Save the new events first, so a failure never leaves the timeline empty.
  const { data: inserted, error } = await supabase.from("timeline_events").insert(rows).select();
  if (error) {
    const denied = error.code === "42501";
    return NextResponse.json(
      { error: denied ? "You don't have permission to change this timeline." : error.message },
      { status: denied ? 403 : 500 },
    );
  }

  if (replace && existing?.length) {
    const { error: deleteError } = await supabase.from("timeline_events").delete().in("id", existing.map((e) => e.id));
    if (deleteError) {
      return NextResponse.json({ events: inserted, warning: "The new events were added, but the old ones couldn't be removed." });
    }
  }

  return NextResponse.json({ events: [...(inserted ?? [])].sort((a, b) => a.order_index - b.order_index) });
}
