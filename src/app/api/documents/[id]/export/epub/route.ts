import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents, documentSections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import Epub from "epub-gen-memory";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    // Get document
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get front/back matter sections
    const sections = await db
      .select()
      .from(documentSections)
      .where(
        and(
          eq(documentSections.documentId, id),
          eq(documentSections.userId, userId),
          eq(documentSections.enabled, true)
        )
      )
      .orderBy(documentSections.createdAt);

    // Parse chapters from content
    const chapters = parseChapters(doc.content, doc.title);

    // Build EPUB chapters array
    const epubChapters: { title: string; content: string }[] = [];

    // Add front matter in order
    const frontMatterOrder = ["cover", "dedication", "foreword", "prologue", "table_of_contents"];
    frontMatterOrder.forEach((type) => {
      const section = sections.find((s) => s.type === type);
      if (!section) return;

      if (type === "cover") {
        epubChapters.push({
          title: doc.title,
          content: `
            <div style="text-align: center; padding: 20% 0;">
              <h1 style="font-size: 2em; margin-bottom: 0.5em;">${doc.title}</h1>
              ${section.content ? `<p style="font-size: 1.2em; margin-top: 1em;">${section.content}</p>` : ""}
              ${doc.genre ? `<p style="margin-top: 2em; font-style: italic;">${doc.genre}</p>` : ""}
            </div>
          `,
        });
      } else if (type === "table_of_contents") {
        const tocItems = chapters.map((ch, i) =>
          `<li>${ch.title}</li>`
        ).join("");
        epubChapters.push({
          title: "Table of Contents",
          content: `<h2>Table of Contents</h2><ol>${tocItems}</ol>`,
        });
      } else {
        epubChapters.push({
          title: section.title || type.replace("_", " "),
          content: section.content
            ? `<h2>${section.title}</h2>${section.content.split("\n").map((p: string) => p.trim() ? `<p>${p}</p>` : "<br/>").join("")}`
            : `<h2>${section.title}</h2>`,
        });
      }
    });

    // Add main chapters
    chapters.forEach((ch) => {
      epubChapters.push({
        title: ch.title,
        content: ch.content,
      });
    });

    // Add back matter
    const backMatterOrder = ["epilogue", "author_note"];
    backMatterOrder.forEach((type) => {
      const section = sections.find((s) => s.type === type);
      if (!section) return;
      epubChapters.push({
        title: section.title || type.replace("_", " "),
        content: section.content
          ? `<h2>${section.title}</h2>${section.content.split("\n").map((p: string) => p.trim() ? `<p>${p}</p>` : "<br/>").join("")}`
          : `<h2>${section.title}</h2>`,
      });
    });

    // Generate EPUB
    const buffer = await Epub({
      title: doc.title || "Untitled",
      author: "Author",
      description: "",
      publisher: "Prosr",
      lang: "en",
      tocTitle: "Table of Contents",
      prependChapterTitles: false,
      css: `
        body {
          font-family: Georgia, serif;
          font-size: 1em;
          line-height: 1.8;
          margin: 0;
          padding: 0;
        }
        h1 {
          font-size: 1.8em;
          font-weight: bold;
          margin: 2em 0 1em;
          text-align: center;
          page-break-before: always;
        }
        h2 {
          font-size: 1.4em;
          font-weight: bold;
          margin: 1.5em 0 0.75em;
        }
        p {
          margin: 0;
          padding: 0;
          text-indent: 1.5em;
          margin-bottom: 0;
        }
        p.no-indent {
          text-indent: 0;
        }
        .scene-break {
          text-align: center;
          margin: 1.5em 0;
        }
        blockquote {
          margin: 1.5em 2em;
          font-style: italic;
        }
      `,
    }, epubChapters);

    const filename = `${(doc.title || "manuscript").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.epub`;

    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": body.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("EPUB export error:", err);
    return NextResponse.json(
      { error: "Failed to generate EPUB", detail: String(err) },
      { status: 500 }
    );
  }
}

function parseChapters(html: string, docTitle: string): { title: string; content: string }[] {
  if (!html) return [{ title: docTitle, content: "<p>No content yet.</p>" }];

  // Parse HTML to find H1 chapter breaks
  const div = `<div>${html}</div>`;

  // Split on H1 tags
  const h1Regex = /<h1[^>]*>(.*?)<\/h1>/gi;
  const parts = html.split(h1Regex);

  if (parts.length <= 1) {
    // No H1 headings — treat whole document as one chapter
    return [{
      title: docTitle,
      content: cleanContent(html),
    }];
  }

  const chapters: { title: string; content: string }[] = [];

  // Parts alternates: [before-first-h1, h1-text, content, h1-text, content, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].replace(/<[^>]+>/g, "").trim();
    const content = parts[i + 1] ?? "";
    if (title || content.trim()) {
      chapters.push({
        title: title || `Chapter ${Math.ceil(i / 2)}`,
        content: `<h1>${title}</h1>${cleanContent(content)}`,
      });
    }
  }

  return chapters.length > 0 ? chapters : [{
    title: docTitle,
    content: cleanContent(html),
  }];
}

function cleanContent(html: string): string {
  if (!html) return "<p></p>";

  return html
    // Fix paragraphs — first paragraph after heading no indent
    .replace(/<p>/g, "<p>")
    // Scene breaks
    .replace(/<hr\s*\/?>/gi, '<p class="scene-break">* * *</p>')
    // Clean up empty paragraphs
    .replace(/<p>\s*<\/p>/g, "<p>&nbsp;</p>")
    // Fix strong/em
    .replace(/<strong>/g, "<strong>")
    .replace(/<em>/g, "<em>")
    .trim();
}