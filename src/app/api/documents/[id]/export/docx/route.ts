import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, PageNumber, Header, Footer, PageBreak,
  NumberFormat, SectionType,
} from "docx";

type RouteParams = { params: Promise<{ id: string }> };

// ── HTML parser ────────────────────────────────────────

interface ParsedNode {
  type: "paragraph" | "heading1" | "heading2" | "heading3" | "blockquote" | "hr";
  text: string;
  align?: "left" | "center" | "right";
  runs: { text: string; bold?: boolean; italic?: boolean; underline?: boolean }[];
}

function parseHtmlToNodes(html: string): ParsedNode[] {
  if (!html) return [];

  const nodes: ParsedNode[] = [];

  // Check if content is basically one big paragraph
  const pTagCount = (html.match(/<p[^>]*>/gi) ?? []).length;
  const contentLength = html.replace(/<[^>]+>/g, "").length;
  const avgParagraphLength = contentLength / Math.max(pTagCount, 1);

  // If average paragraph is very long (>500 chars) — content needs splitting
  const needsSplitting = avgParagraphLength > 500;

  // Extract all text content preserving structure
  const div = `<div>${html}</div>`;

  // Process each <p> tag
  const blockRegex = /<(h[1-6]|p|blockquote|hr)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  const matches = Array.from(html.matchAll(blockRegex));

  if (matches.length === 0) {
    // No tags — treat as plain text and split aggressively
    const paragraphs = splitIntoSentenceGroups(html.replace(/<[^>]+>/g, ""));
    for (const p of paragraphs) {
      if (p.trim()) {
        nodes.push({ type: "paragraph", text: p.trim(), runs: [{ text: p.trim() }] });
      }
    }
    return nodes;
  }

  for (const match of matches) {
    const tag = match[1]?.toLowerCase() ?? "hr";
    const inner = match[2] ?? "";

    if (tag === "hr") {
      nodes.push({ type: "hr", text: "* * *", runs: [{ text: "* * *" }] });
      continue;
    }

    const styleAttr = match[0].match(/style="[^"]*text-align:\s*(left|center|right)/i);
    const align = (styleAttr?.[1] as "left" | "center" | "right") ?? "left";

    const text = stripTags(inner).trim();
    if (!text) continue;

    let type: ParsedNode["type"] = "paragraph";
    if (tag === "h1") type = "heading1";
    else if (tag === "h2") type = "heading2";
    else if (tag === "h3") type = "heading3";
    else if (tag === "blockquote") type = "blockquote";

    // Always split — even short paragraphs might have merged sentences
    const subParagraphs = needsSplitting || text.length > 300
      ? splitIntoSentenceGroups(text)
      : [text];

    for (let i = 0; i < subParagraphs.length; i++) {
      const trimmed = subParagraphs[i].trim();
      if (!trimmed) continue;
      nodes.push({
        type: i === 0 ? type : "paragraph",
        text: trimmed,
        align,
        runs: [{ text: trimmed }],
      });
    }
  }

  return nodes;
}

function splitIntoSentenceGroups(text: string): string[] {
  if (!text) return [];

  let result = text
    // Words running together — period followed directly by capital
    .replace(/([a-z][.!?])([A-Z])/g, "$1\n\n$2")
    // Closing quote followed directly by capital
    .replace(/([.!?]["'\u201d\u2019])([A-Z"'\u201c\u2018])/g, "$1\n\n$2")
    // Closing quote + space + narrative word
    .replace(
      /([.!?]["'\u201d\u2019])\s+(He|She|I|They|It|We|You|His|Her|The|A|An|My|Our|Your|Their|Then|But|And|So|When|As|After|Before|While|Now|Here|There)\b/g,
      "$1\n\n$2"
    )
    // New dialogue after narrative
    .replace(/([.!?,])\s+(["'\u201c\u2018][A-Z])/g, "$1\n\n$2")
    // Sentence end followed by new dialogue starting with capital
    .replace(/([.!?])\s{2,}(["'\u201c\u2018])/g, "$1\n\n$2");

  return result
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function parseInlineHtml(html: string): { text: string; bold?: boolean; italic?: boolean; underline?: boolean }[] {
  const runs: { text: string; bold?: boolean; italic?: boolean; underline?: boolean }[] = [];

  // Strip all HTML tags and decode entities for simple text
  const text = html
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, content) => {
      runs.push({ text: stripTags(content), bold: true });
      return "";
    })
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, content) => {
      runs.push({ text: stripTags(content), italic: true });
      return "";
    })
    .replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, (_, content) => {
      runs.push({ text: stripTags(content), underline: true });
      return "";
    })
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();

  if (text) runs.unshift({ text });

  return runs.length > 0 ? runs : [{ text: "" }];
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

// ── Node to docx Paragraph ────────────────────────────

function nodeToDocxParagraph(node: ParsedNode, isFirst: boolean): Paragraph {
  const alignment =
    node.align === "center" ? AlignmentType.CENTER :
    node.align === "right"  ? AlignmentType.RIGHT  :
    AlignmentType.LEFT;

  switch (node.type) {
    case "heading1":
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment,
        pageBreakBefore: true,
        spacing: { before: 480, after: 240 },
        children: node.runs.map((r) => new TextRun({
          text: r.text,
          bold: r.bold,
          italics: r.italic,
        })),
      });

    case "heading2":
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment,
        spacing: { before: 360, after: 120 },
        children: node.runs.map((r) => new TextRun({
          text: r.text,
          bold: r.bold,
          italics: r.italic,
        })),
      });

    case "heading3":
      return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        alignment,
        spacing: { before: 240, after: 120 },
        children: node.runs.map((r) => new TextRun({
          text: r.text,
          bold: r.bold ?? true,
        })),
      });

    case "hr":
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 },
        children: [new TextRun({ text: "* * *" })],
      });

    case "blockquote":
      return new Paragraph({
        indent: { left: 720 },
        spacing: { before: 120, after: 120 },
        children: node.runs.map((r) => new TextRun({
          text: r.text,
          italics: true,
        })),
      });

    default: {
      // Regular paragraph
      // First paragraph after heading — no indent
      // Subsequent — first line indent
      const indent = isFirst ? undefined : { firstLine: 720 };

      return new Paragraph({
        alignment,
        indent,
        spacing: { before: 0, after: 0, line: 360, lineRule: "auto" as any },
        children: node.runs.map((r) => new TextRun({
          text: r.text,
          bold: r.bold,
          italics: r.italic,
          underline: r.underline ? {} : undefined,
        })),
      });
    }
  }
}

// ── Main route ─────────────────────────────────────────

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

    console.log("DOCX export for:", doc.title);

    // Parse HTML to structured nodes
    const nodes = parseHtmlToNodes(doc.content ?? "");
    console.log("Parsed nodes:", nodes.length);

    // Convert to docx paragraphs
    const docxParagraphs: Paragraph[] = [];
    let isFirstAfterHeading = true;

    for (const node of nodes) {
      if (node.type === "heading1" || node.type === "heading2" || node.type === "heading3") {
        isFirstAfterHeading = true;
      }

      docxParagraphs.push(nodeToDocxParagraph(node, isFirstAfterHeading));

      if (node.type === "paragraph" || node.type === "blockquote") {
        isFirstAfterHeading = false;
      }
    }

    if (docxParagraphs.length === 0) {
      docxParagraphs.push(new Paragraph({
        children: [new TextRun({ text: "" })],
      }));
    }

    // Build document
    const document = new Document({
      numbering: {
        config: [],
      },
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 24, // 12pt in half-points
            },
            paragraph: {
              spacing: { line: 360, lineRule: "auto" as any },
            },
          },
        },
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: {
              font: "Times New Roman",
              size: 24,
            },
          },
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: "Times New Roman",
              size: 36,
              bold: true,
            },
            paragraph: {
              spacing: { before: 480, after: 240 },
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: "Times New Roman",
              size: 28,
              bold: true,
            },
            paragraph: {
              spacing: { before: 360, after: 120 },
            },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 12240,  // 8.5 inches in DXA
                height: 15840, // 11 inches in DXA
              },
              margin: {
                top: 1440,    // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: doc.title || "Untitled",
                      font: "Times New Roman",
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: "Times New Roman",
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          },
          children: docxParagraphs,
        },
      ],
    });

    const buffer = await Packer.toBuffer(document);
const uint8Array = new Uint8Array(buffer);

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