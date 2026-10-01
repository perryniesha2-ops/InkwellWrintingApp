import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  buildChapterTree, compileManuscript, countWords, flattenChapterTree, splitHtmlIntoChapters,
  type Chapter,
} from "@/lib/chapters";
import { getPreset, type ExportBook, type ExportFormat, type FontId } from "@/lib/export/presets";
import { renderManuscriptPdf } from "@/lib/export/manuscriptPdf";
import { renderManuscriptDocx } from "@/lib/export/manuscriptDocx";

type RouteParams = { params: Promise<{ id: string }> };

interface ExportRequest {
  format?: ExportFormat;
  preset?: string;
  font?: FontId;
  author?: string;
  contact?: string;
  frontMatter?: boolean;
  sceneTitles?: boolean;
}

/** Print-ready PDF or DOCX: KDP paperback trim sizes or Standard Manuscript Format. */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as ExportRequest;
  const preset = getPreset(body.preset);
  const font = body.font && preset.fonts.includes(body.font) ? body.font : preset.fonts[0];
  const format: ExportFormat = body.format === "docx" ? "docx" : "pdf";

  const [{ data: doc }, { data: rows }] = await Promise.all([
    supabase.from("documents").select("title, content").eq("id", id).single(),
    supabase.from("chapters").select("id, document_id, parent_id, title, content, synopsis, guidance, order_index").eq("document_id", id),
  ]);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Books not yet opened since chapters were introduced: split the legacy content.
  const chapters: ExportBook["chapters"] = rows?.length
    ? flattenChapterTree(buildChapterTree(rows as Chapter[])).map((c) => ({
        title: c.title, level: c.parent_id ? 2 : 1, html: c.content,
      }))
    : splitHtmlIntoChapters(doc.content ?? "").map((s) => ({
        title: s.title, level: s.parentIndex === null ? 1 : 2, html: s.content,
      }));

  const book: ExportBook = {
    title: doc.title || "Untitled",
    chapters,
    wordCount: countWords(rows?.length ? compileManuscript(rows as Chapter[]) : doc.content ?? ""),
  };
  const options = {
    preset,
    font,
    author: (body.author ?? "").slice(0, 200),
    contact: (body.contact ?? "").slice(0, 1000),
    frontMatter: body.frontMatter ?? true,
    sceneTitles: body.sceneTitles ?? false,
  };

  try {
    const buffer = format === "pdf"
      ? await renderManuscriptPdf(book, options)
      : await renderManuscriptDocx(book, options);
    const slug = book.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "manuscript";
    const suffix = preset.kind === "kdp" ? `kdp-${preset.width}x${preset.height}` : "manuscript";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${slug}-${suffix}.${format}"`,
      },
    });
  } catch (err) {
    console.error("Manuscript export error:", err);
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}
