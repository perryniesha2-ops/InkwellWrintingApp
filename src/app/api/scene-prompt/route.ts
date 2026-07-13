import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { scene, bibleContext, genre } = await req.json();
    if (!scene)
      return NextResponse.json({ error: "No scene provided" }, { status: 400 });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: `You are an expert at writing image generation prompts for book illustrations and character art.

Given a scene excerpt and Story Bible details, generate 3 image prompts.
Use specific physical details from the Story Bible for any characters mentioned.
Each prompt should be ready to paste directly into Midjourney, DALL-E 3, or Leonardo AI.

CRITICAL JSON RULES:
- Return ONLY valid JSON, no markdown, no backticks
- Every string value must be on a single line, no newlines inside strings

Return this exact format:
{
  "portrait": {
    "title": "Character Portrait",
    "prompt": "detailed prompt focused on the main character",
    "tool": "Best for Midjourney or DALL-E 3"
  },
  "scene": {
    "title": "Scene Illustration",
    "prompt": "detailed prompt of the full scene setting and action",
    "tool": "Best for Midjourney or Leonardo AI"
  },
  "cover": {
    "title": "Cover Art",
    "prompt": "dramatic cinematic prompt suitable for a book cover",
    "tool": "Best for DALL-E 3 or Adobe Firefly"
  },
  "mood": "2-3 words describing emotional tone",
  "style": "suggested art style for this genre",
  "characters_detected": ["character names found in the scene"]
}`,
        messages: [
          {
            role: "user",
            content: `Generate image prompts for this scene.\n\n${genre ? `GENRE: ${genre}\n\n` : ""}${bibleContext ? `STORY BIBLE:\n${bibleContext}\n\n` : ""}SCENE:\n"${scene}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic error:", response.status);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text ?? "{}";
    const stripped = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : stripped;

    try {
      return NextResponse.json(JSON.parse(jsonStr));
    } catch {
      console.error("JSON parse error:", rawText.slice(0, 200));
      return NextResponse.json(
        { error: "Failed to parse response" },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("Scene prompt error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
