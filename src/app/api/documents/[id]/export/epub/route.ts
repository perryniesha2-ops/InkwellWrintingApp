import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  generateCSS,
  generateChapterHeading,
  processContent,
  DEFAULT_SETTINGS,
  type EpubSettings,
} from "@/lib/epub/typography";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

type RouteParams = { params: Promise<{ id: string }> };

function parseChapters(html: string): { title: string; body: string }[] {
  if (!html || html.trim() === "") return [];

  const h1Regex = /<h1[^>]*>(.*?)<\/h1>/gi;
  const parts = html.split(h1Regex);

  if (parts.length <= 1) {
    return [{ title: "", body: html }];
  }

  const chapters: { title: string; body: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].replace(/<[^>]+>/g, "").trim();
    const body = parts[i + 1] ?? "";
    if (title || body.trim()) {
      chapters.push({ title, body });
    }
  }

  return chapters.length > 0 ? chapters : [{ title: "", body: html }];
}

function generateSvgCover(title: string, genre?: string | null): Buffer {
  const safeTitle = (title || "Untitled")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeGenre = genre
    ? genre.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : "";

  const words = safeTitle.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > 20) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());

  const titleY = 380 - (lines.length - 1) * 28;
  const titleSvg = lines.map((line, i) =>
    `<text x="300" y="${titleY + i * 56}" font-family="Georgia, serif" font-size="48" fill="#f5f5f5" text-anchor="middle" font-weight="bold">${line}</text>`
  ).join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <rect width="600" height="900" fill="#1c1c1e"/>
  <rect x="30" y="30" width="540" height="840" fill="none" stroke="#d4a843" stroke-width="1.5"/>
  <rect x="38" y="38" width="524" height="824" fill="none" stroke="#d4a843" stroke-width="0.5" opacity="0.4"/>
  ${titleSvg}
  <line x1="180" y1="${titleY + lines.length * 56 + 10}" x2="420" y2="${titleY + lines.length * 56 + 10}" stroke="#d4a843" stroke-width="1"/>
  ${safeGenre ? `<text x="300" y="${titleY + lines.length * 56 + 40}" font-family="Georgia, serif" font-size="16" fill="#d4a843" text-anchor="middle" font-style="italic">${safeGenre}</text>` : ""}
  <text x="300" y="860" font-family="Georgia, serif" font-size="12" fill="#4a4a4a" text-anchor="middle" letter-spacing="2">ADVANCE READING COPY</text>
</svg>`;

  return Buffer.from(svg, "utf-8");
}

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let coverPath: string | null = null;
  let epubOutputPath: string | null = null;

  try {
    const { id } = await params;

    let settings: EpubSettings = DEFAULT_SETTINGS;
    try {
      const body = await req.json() as Partial<EpubSettings>;
      settings = { ...DEFAULT_SETTINGS, ...body };
    } catch {
      settings = DEFAULT_SETTINGS;
    }

    console.log("EPUB export starting for:", id);

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.log("Document found:", doc.title);

    const { data: sections } = await supabase
      .from("document_sections")
      .select("*")
      .eq("document_id", id)
      .eq("enabled", true)
      .order("created_at");

    const chapters = parseChapters(doc.content ?? "");
    console.log("Chapters parsed:", chapters.length);

    // Cover image
    if (doc.cover_image) {
      try {
        const coverRes = await fetch(doc.cover_image);
        const coverBuffer = await coverRes.arrayBuffer();
        const ext = doc.cover_image.split(".").pop()?.split("?")[0] ?? "jpg";
        coverPath = join(tmpdir(), `prosr-cover-${doc.id}.${ext}`);
        writeFileSync(coverPath, Buffer.from(coverBuffer));
        console.log("Using uploaded cover");
      } catch {
        console.log("Failed to download cover, using generated SVG");
      }
    }

    if (!coverPath) {
      const coverSvg = generateSvgCover(doc.title, doc.genre);
      coverPath = join(tmpdir(), `prosr-cover-${doc.id}.svg`);
      writeFileSync(coverPath, coverSvg);
    }

    const epubChapters: { title: string; content: string }[] = [];

    // Front matter
    const frontOrder = ["cover", "dedication", "foreword", "prologue"];
    for (const type of frontOrder) {
      const section = sections?.find((s) => s.type === type);
      if (!section) continue;
      if (type === "cover") continue;
      const bodyHtml = section.content
        ? section.content.split("\n").map((p: string) =>
            p.trim() ? `<p>${p}</p>` : `<p>&nbsp;</p>`
          ).join("")
        : "";
      epubChapters.push({
        title: section.title || type,
        content: `
<div style="text-align:center;padding-top:15%;margin-bottom:3em;">
  <h1 style="font-size:1.4em;">${section.title || type.replace("_", " ")}</h1>
  <div style="width:3em;height:1px;background:#1a1a1a;margin:1em auto;"></div>
</div>
${bodyHtml}`,
      });
    }

    // Copyright
    epubChapters.push({
      title: "Copyright",
      content: `
<div style="padding-top:40%;text-align:center;">
  <p style="text-indent:0;font-size:0.85em;color:#555;">${doc.title || "Untitled"}</p>
  <p style="text-indent:0;font-size:0.85em;color:#555;margin-top:1em;">
    Advance Reading Copy · Generated by Prosr<br/>Not for distribution.
  </p>
</div>`,
    });

    // TOC
    if (chapters.length > 1) {
      const tocHtml = chapters.map((ch, i) =>
        `<p style="text-indent:0;margin-bottom:0.5em;">${ch.title || `Chapter ${i + 1}`}</p>`
      ).join("");
      epubChapters.push({
        title: "Contents",
        content: `
<div style="text-align:center;padding-top:10%;margin-bottom:2em;">
  <h1 style="font-size:1.4em;">Contents</h1>
  <div style="width:3em;height:1px;background:#1a1a1a;margin:1em auto;"></div>
</div>
${tocHtml}`,
      });
    }

    // Main chapters
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      try {
        const heading = generateChapterHeading(i + 1, ch.title, settings);
        const body = processContent(ch.body, settings);
        const bodyWithDropCap = settings.dropCap
          ? body.replace(/<p>/, '<p class="drop-cap">')
          : body;
        epubChapters.push({
          title: ch.title || `Chapter ${i + 1}`,
          content: `${heading}\n${bodyWithDropCap}`,
        });
      } catch (chErr) {
        console.error(`Chapter ${i + 1} error:`, chErr);
        epubChapters.push({
          title: ch.title || `Chapter ${i + 1}`,
          content: `<h1>${ch.title || `Chapter ${i + 1}`}</h1>${ch.body}`,
        });
      }
    }

    // Back matter
    const backOrder = ["epilogue", "author_note"];
    for (const type of backOrder) {
      const section = sections?.find((s) => s.type === type);
      if (!section) continue;
      const bodyHtml = section.content
        ? section.content.split("\n").map((p: string) =>
            p.trim() ? `<p>${p}</p>` : `<p>&nbsp;</p>`
          ).join("")
        : "";
      epubChapters.push({
        title: section.title || type.replace("_", " "),
        content: `
<div style="text-align:center;padding-top:15%;margin-bottom:3em;">
  <h1 style="font-size:1.4em;">${section.title || type.replace("_", " ")}</h1>
  <div style="width:3em;height:1px;background:#1a1a1a;margin:1em auto;"></div>
</div>
${bodyHtml}`,
      });
    }

    if (epubChapters.length === 0) {
      epubChapters.push({
        title: doc.title || "Untitled",
        content: "<p>No content yet.</p>",
      });
    }

    let css = "";
    try {
      css = generateCSS(settings);
    } catch {
      css = "body { font-family: Georgia, serif; font-size: 1em; line-height: 1.8; }";
    }

    console.log("Importing nodepub...");
    const nodepub = await import("nodepub");
    const nodepubDefault = nodepub.default;

    const epubDoc = nodepubDefault.document({
      id: doc.id,
      title: doc.title || "Untitled",
      author: "Author",
      cover: coverPath,
      genre: doc.genre ?? "Fiction",
      language: "en",
      showContents: chapters.length > 1,
      css,
      description: "",
      publisher: "Prosr",
    }, "");

    for (const ch of epubChapters) {
      epubDoc.addSection(ch.title, ch.content);
    }

    const { readFileSync, existsSync } = await import("fs");
    const tmp = tmpdir();
    const epubFilename = `prosr-${doc.id}`;
    epubOutputPath = join(tmp, `${epubFilename}.epub`);

    await epubDoc.writeEPUB(tmp, epubFilename);

    if (!existsSync(epubOutputPath)) {
      throw new Error(`EPUB file not found at ${epubOutputPath}`);
    }

    const buffer = readFileSync(epubOutputPath);
    console.log("Buffer size:", buffer.byteLength);

    const uint8Array = new Uint8Array(buffer);
    const filename = `${(doc.title || "manuscript")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()}.epub`;

    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": uint8Array.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("EPUB export error:", String(err));
    return NextResponse.json(
      { error: "Failed to generate EPUB", detail: String(err) },
      { status: 500 }
    );
  } finally {
    if (coverPath) { try { unlinkSync(coverPath); } catch { /* ignore */ } }
    if (epubOutputPath) { try { unlinkSync(epubOutputPath); } catch { /* ignore */ } }
  }
}