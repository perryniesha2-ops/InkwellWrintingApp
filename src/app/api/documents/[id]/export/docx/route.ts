import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import HTMLtoDOCX from "html-to-docx";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Clean and fix the HTML before converting
    const html = fixHtml(doc.content ?? "", doc.title ?? "Untitled");

    const fileBuffer = await HTMLtoDOCX(html, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      font: "Times New Roman",
      fontSize: 24,
      margins: {
        top: 1440,
        right: 1440,
        bottom: 1440,
        left: 1440,
      },
    });

    const uint8Array = new Uint8Array(fileBuffer as Buffer);
    const filename = `${(doc.title || "manuscript")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()}.docx`;

    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": uint8Array.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("DOCX export error:", err);
    return NextResponse.json(
      { error: "Failed to generate DOCX", detail: String(err) },
      { status: 500 }
    );
  }
}

function fixHtml(html: string, title: string): string {
  if (!html) return "<p></p>";

  // Fix merged sentences
  let fixed = html
    // Closing quote + optional space + opening quote
    .replace(/([.!?,]["'\u201d\u2019])\s*(["'\u201c\u2018])/g, "$1</p><p>$2")
    // Closing quote + optional space + capital I
    .replace(/([.!?]["'\u201d\u2019])\s*(I[\s''])/g, "$1</p><p>$2")
    // Closing quote + optional space + capital letter
    .replace(/([.!?]["'\u201d\u2019])\s*([A-Z][a-z])/g, "$1</p><p>$2")
    // Lowercase + period + capital (no space)
    .replace(/([a-z][.!?])([A-Z][a-z])/g, "$1</p><p>$2")
    // Lowercase + period + I
    .replace(/([a-z][.!?])\s*(I[\s''])/g, "$1</p><p>$2")
    // Sentence end + new dialogue
    .replace(/([.!?])\s+(["'\u201c\u2018][A-Z])/g, "$1</p><p>$2")
    // Closing quote + narrative word
    .replace(
      /([.!?]["'\u201d\u2019])\s+(He|She|I\b|They|It|We|You|His|Her|The|A|An|My|Our|Your|Their|Then|But|And|So|When|As|After|Before|While|Now|Here|There|This|That)\b/g,
      "$1</p><p>$2"
    );

  // Wrap in full HTML document with styles
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 2;
    margin: 0;
    padding: 0;
  }
  p {
    margin: 0;
    padding: 0;
    text-indent: 0.5in;
  }
  /* First paragraph after heading — no indent */
  h1 + p, h2 + p, h3 + p {
    text-indent: 0;
  }
  h1 {
    font-family: "Times New Roman", Times, serif;
    font-size: 18pt;
    font-weight: bold;
    text-align: center;
    margin-top: 2in;
    margin-bottom: 0.5in;
    page-break-before: always;
  }
  h2 {
    font-family: "Times New Roman", Times, serif;
    font-size: 14pt;
    font-weight: bold;
    margin-top: 0.5in;
    margin-bottom: 0.25in;
  }
  h3 {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    font-weight: bold;
    margin-top: 0.25in;
    margin-bottom: 0.1in;
  }
  blockquote {
    margin: 0.25in 0.5in;
    font-style: italic;
  }
  hr {
    border: none;
    text-align: center;
  }
  hr::after {
    content: "* * *";
  }
</style>
</head>
<body>
${fixed}
</body>
</html>`;
}