import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  documents, storyBibles, characters,
  outlineSections, worldEntries,
} from "@/lib/schema";

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
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as OnboardingBody;

  // 1. Create document
  const [doc] = await db.insert(documents).values({
    userId,
    title: body.title || "Untitled",
    content: "",
    genre: body.genre || null,
    wordCount: 0,
  }).returning();

  // 2. Create story bible
  const [bible] = await db.insert(storyBibles).values({
    documentId: doc.id,
    userId,
  }).returning();

  // 3. Create characters
  if (body.characters?.length > 0) {
    await db.insert(characters).values(
      body.characters.map((char) => ({
        bibleId: bible.id,
        userId,
        name: char.name,
        role: char.role,
        traits: char.traits,
        hair: char.hair,
        eyes: char.eyes,
        heightBuild: char.heightBuild,
        firstImpression: char.firstImpression,
        externalGoal: char.externalGoal,
        fears: char.fears,
      }))
    );
  }

  // 4. Create world entries for locations
  if (body.locations?.length > 0) {
    await db.insert(worldEntries).values(
      body.locations.map((loc) => ({
        bibleId: bible.id,
        userId,
        title: loc.title,
        category: "location",
        oneLine: loc.oneLine,
        atmosphere: loc.atmosphere,
        content: `${body.timePeriod ? `Time period: ${body.timePeriod}. ` : ""}${loc.oneLine}`,
      }))
    );
  }

  // 5. Create outline sections
  const outlineItems = [];

  if (body.incitingIncident) {
    outlineItems.push({
      bibleId: bible.id,
      userId,
      title: "Inciting Incident",
      type: "scene",
      orderIndex: 0,
      content: body.incitingIncident,
      purpose: "Hook the reader and set the story in motion",
    });
  }

  if (body.midpoint) {
    outlineItems.push({
      bibleId: bible.id,
      userId,
      title: "Midpoint",
      type: "scene",
      orderIndex: Math.floor((body.chapterCount || 20) / 2),
      content: body.midpoint,
      purpose: "Point of no return — everything changes",
    });
  }

  if (body.blackMoment) {
    outlineItems.push({
      bibleId: bible.id,
      userId,
      title: "Black Moment",
      type: "scene",
      orderIndex: Math.floor((body.chapterCount || 20) * 0.85),
      content: body.blackMoment,
      purpose: "The darkest point before the resolution",
    });
  }

  if (body.resolution) {
    outlineItems.push({
      bibleId: bible.id,
      userId,
      title: "Resolution",
      type: "scene",
      orderIndex: body.chapterCount || 20,
      content: body.resolution,
      purpose: "How the story ends",
    });
  }

  if (outlineItems.length > 0) {
    await db.insert(outlineSections).values(outlineItems);
  }

  return NextResponse.json({ documentId: doc.id, bibleId: bible.id });
}