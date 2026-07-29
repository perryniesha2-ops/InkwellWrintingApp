import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import {
  generateCSS,
  generateChapterHeading,
  processContent,
  DEFAULT_SETTINGS,
  FONTS,
  type EpubSettings,
} from "@/lib/epub/typography";

type RouteParams = { params: Promise<{ id: string }> };

function parseChapters(html: string): { title: string; body: string }[] {
  if (!html) return [];
  const h1Regex = /<h1[^>]*>(.*?)<\/h1>/gi;
  const parts = html.split(h1Regex);
  if (parts.length <= 1) return [{ title: "", body: html }];
  const chapters: { title: string; body: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].replace(/<[^>]+>/g, "").trim();
    const body = parts[i + 1] ?? "";
    if (title || body.trim()) chapters.push({ title, body });
  }
  return chapters;
}

export async function POST(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const settings: EpubSettings = { ...DEFAULT_SETTINGS, ...await req.json() };

    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const font = FONTS[settings.bodyFont];
    const chapters = parseChapters(doc.content);

    const chaptersHtml = chapters.map((ch, i) => {
      const heading = generateChapterHeading(i + 1, ch.title, settings);
      const body = processContent(ch.body, settings);
      const bodyWithDropCap = settings.dropCap
        ? body.replace(/<p>/, '<p class="drop-cap">')
        : body;
      return `${heading}\n${bodyWithDropCap}`;
    }).join("\n");

    // Build full print HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${doc.title || "Untitled"}</title>
${font.googleFamily ? `<link href="https://fonts.googleapis.com/css2?family=${font.googleFamily}&display=swap" rel="stylesheet">` : ""}
<style>
  /* Print page setup */
  @page {
    size: 6in 9in;
    margin: 1in 0.875in 1in 0.875in;
  }

  @media print {
    body { margin: 0; }
    .no-print { display: none; }
  }

  /* Base */
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: ${font.stack};
    font-size: 11pt;
    line-height: ${settings.lineHeight === "tight" ? "1.5" : settings.lineHeight === "loose" ? "1.9" : "1.7"};
    color: #1a1a1a;
    -webkit-hyphens: auto;
    hyphens: auto;
    orphans: 2;
    widows: 2;
  }

  /* Running headers */
  @page :left {
    @top-left {
      content: "${doc.title || ""}";
      font-family: ${font.stack};
      font-size: 8pt;
      color: #888;
    }
    @bottom-center {
      content: counter(page);
      font-family: ${font.stack};
      font-size: 9pt;
      color: #888;
    }
  }
  @page :right {
    @top-right {
      content: "Author";
      font-family: ${font.stack};
      font-size: 8pt;
      color: #888;
    }
    @bottom-center {
      content: counter(page);
      font-family: ${font.stack};
      font-size: 9pt;
      color: #888;
    }
  }
  @page :first {
    @top-left { content: ""; }
    @top-right { content: ""; }
    @bottom-center { content: ""; }
  }

  /* Paragraphs */
  p {
    margin: 0;
    padding: 0;
    text-indent: 1.5em;
  }
  h1 + p, h2 + p, .scene-break + p,
  .chapter-heading + p, p.no-indent, p:first-of-type {
    text-indent: 0;
  }

  ${settings.dropCap ? `
  .drop-cap::first-letter,
  p.drop-cap::first-letter {
    font-size: 3.4em;
    font-weight: bold;
    float: left;
    line-height: 0.75;
    margin: 0.05em 0.08em 0 0;
  }
  ` : ""}

  .scene-break {
    text-align: center;
    margin: 1.5em 0;
    font-size: 1.1em;
    letter-spacing: 0.3em;
  }

  /* Inject epub CSS for chapter headings */
  ${generateCSS(settings)
    .replace(/body\s*\{[^}]+\}/g, "")
    .replace(/\* \{[^}]+\}/g, "")
  }

  /* Print-specific overrides */
  .chapter-heading {
    page-break-before: always;
  }
  .chapter-heading:first-child {
    page-break-before: avoid;
  }

  strong { font-weight: bold; }
  em { font-style: italic; }
  blockquote {
    margin: 1.5em 2em;
    font-style: italic;
    border-left: 2px solid #ccc;
    padding-left: 1em;
  }
</style>
</head>
<body>

<!-- Title page -->
<div style="text-align: center; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; page-break-after: always;">
  <h1 style="font-size: 2em; font-weight: bold; margin-bottom: 0.5em;">${doc.title || "Untitled"}</h1>
  ${doc.genre ? `<p style="font-style: italic; color: #555; text-indent: 0; margin-top: 1em;">${doc.genre}</p>` : ""}
  <p style="text-indent: 0; margin-top: 3em; font-size: 0.85em; color: #888;">Advance Reading Copy · Not for Distribution</p>
</div>

<!-- Chapters -->
${chaptersHtml}

</body>
</html>`;

    // Return HTML that the browser can print to PDF
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("PDF export error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF", detail: String(err) },
      { status: 500 }
    );
  }
}