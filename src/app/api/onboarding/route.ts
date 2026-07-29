import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface OnboardingCharacter {
  name: string;
  role: string;
  traits: string[];
  hair: string;
  eyes: string;
  heightBuild: string;
  firstImpression: string;
  externalGoal: string;
  fears: string;
}

interface OnboardingLocation {
  title: string;
  oneLine: string;
  atmosphere: string;
}

interface OnboardingBody {
  title: string;
  genre: string;
  subgenre: string;
  premise: string;
  timePeriod: string;
  setting: string;
  characters: OnboardingCharacter[];
  locations: OnboardingLocation[];
  chapterCount: number;
  incitingIncident: string;
  midpoint: string;
  blackMoment: string;
  resolution: string;
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as OnboardingBody;

  // 1. Create document
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title: body.title || "Untitled",
      content: "",
      genre: body.genre || null,
      word_count: 0,
    })
    .select()
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: docError?.message ?? "Failed to create document" }, { status: 500 });
  }

  // 2. Create story bible
  const { data: bible, error: bibleError } = await supabase
    .from("story_bibles")
    .insert({
      document_id: doc.id,
      user_id: user.id,
    })
    .select()
    .single();

  if (bibleError || !bible) {
    return NextResponse.json({ error: bibleError?.message ?? "Failed to create bible" }, { status: 500 });
  }

  // 3. Create characters
  if (body.characters?.length > 0) {
    const { error: charError } = await supabase
      .from("characters")
      .insert(
        body.characters.map((char) => ({
          bible_id: bible.id,
          user_id: user.id,
          name: char.name,
          role: char.role,
          traits: char.traits,
          hair: char.hair,
          eyes: char.eyes,
          height_build: char.heightBuild,
          first_impression: char.firstImpression,
          external_goal: char.externalGoal,
          fears: char.fears,
        }))
      );

    if (charError) console.error("Character insert error:", charError);
  }

  // 4. Create world entries for locations
  if (body.locations?.length > 0) {
    const { error: worldError } = await supabase
      .from("world_entries")
      .insert(
        body.locations.map((loc) => ({
          bible_id: bible.id,
          user_id: user.id,
          title: loc.title,
          category: "location",
          one_line: loc.oneLine,
          atmosphere: loc.atmosphere,
          content: `${body.timePeriod ? `Time period: ${body.timePeriod}. ` : ""}${loc.oneLine}`,
        }))
      );

    if (worldError) console.error("World entry insert error:", worldError);
  }

  // 5. Create outline sections
  const outlineItems: {
    bible_id: string;
    user_id: string;
    title: string;
    type: string;
    order_index: number;
    content: string;
    purpose: string;
  }[] = [];

  if (body.incitingIncident) {
    outlineItems.push({
      bible_id: bible.id,
      user_id: user.id,
      title: "Inciting Incident",
      type: "scene",
      order_index: 0,
      content: body.incitingIncident,
      purpose: "Hook the reader and set the story in motion",
    });
  }

  if (body.midpoint) {
    outlineItems.push({
      bible_id: bible.id,
      user_id: user.id,
      title: "Midpoint",
      type: "scene",
      order_index: Math.floor((body.chapterCount || 20) / 2),
      content: body.midpoint,
      purpose: "Point of no return — everything changes",
    });
  }

  if (body.blackMoment) {
    outlineItems.push({
      bible_id: bible.id,
      user_id: user.id,
      title: "Black Moment",
      type: "scene",
      order_index: Math.floor((body.chapterCount || 20) * 0.85),
      content: body.blackMoment,
      purpose: "The darkest point before the resolution",
    });
  }

  if (body.resolution) {
    outlineItems.push({
      bible_id: bible.id,
      user_id: user.id,
      title: "Resolution",
      type: "scene",
      order_index: body.chapterCount || 20,
      content: body.resolution,
      purpose: "How the story ends",
    });
  }

  if (outlineItems.length > 0) {
    const { error: outlineError } = await supabase
      .from("outline_sections")
      .insert(outlineItems);

    if (outlineError) console.error("Outline insert error:", outlineError);
  }

  return NextResponse.json({ documentId: doc.id, bibleId: bible.id });
}