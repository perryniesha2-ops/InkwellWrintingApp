import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, bibleContext } = await req.json();
  if (!document)
    return NextResponse.json(
      { error: "No document provided" },
      { status: 400 },
    );

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
      system: `You are a precise literary consistency checker.

Compare the document against its Story Bible and identify inconsistencies.

Respond with ONLY valid JSON:
{
  "issues": [
    {
      "type": "character|continuity|world|timeline|style",
      "severity": "high|medium|low",
      "title": "Brief title",
      "description": "Detailed explanation",
      "quote": "Exact text from document (max 100 chars)",
      "suggestion": "How to fix it"
    }
  ],
  "summary": "Brief overall assessment",
  "score": 0-100
}

Return ONLY the JSON.`,
      messages: [
        {
          role: "user",
          content: `Check this document for consistency issues.\n\n${bibleContext ?? "No Story Bible provided."}\n\nDOCUMENT:\n---\n${document}\n---\n\nReturn JSON only.`,
        },
      ],
    }),
  });

  if (!response.ok) {
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
    return NextResponse.json(
      { error: "Failed to parse response" },
      { status: 500 },
    );
  }
}
