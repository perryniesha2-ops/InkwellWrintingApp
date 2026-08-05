import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, PageNumber, Header, Footer,
} from "docx";

type RouteParams = { params: Promise<{ id: string }> };

// ── Helpers ────────────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function splitIntoSentenceGroups(text: string): string[] {
  if (!text) return [];

  let result = text
    // ANY punctuation + closing quote + optional space + opening quote
    .replace(/([.!?,]["'\u201d\u2019])\s*(["'\u201c\u2018])/g, "$1\n\n$2")
    // ANY punctuation + closing quote + capital I directly after
    .replace(/([.!?]["'\u201d\u2019])\s*(I[\s'])/g, "$1\n\n$2")
    // ANY punctuation + closing quote + capital letter directly after
    .replace(/([.!?]["'\u201d\u2019])\s*([A-Z][a-z])/g, "$1\n\n$2")
    // Period directly followed by capital — no space
    .replace(/([a-z][.!?])([A-Z][a-z])/g, "$1\n\n$2")
    // Period + I with no space
    .replace(/([a-z][.!?])\s*(I[\s'])/g, "$1\n\n$2")
    // Sentence end + space + new dialogue opening
    .replace(/([.!?])\s+(["'\u201c\u2018][A-Z])/g, "$1\n\n$2")
    // Closing quote + space + narrative word
    .replace(
      /([.!?]["'\u201d\u2019])\s+(He|She|I\b|They|It|We|You|His|Her|The|A|An|My|Our|Your|Their|Then|But|And|So|When|As|After|Before|While|Now|Here|There)\b/g,
      "$1\n\n$2"
    );

  const parts = result
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Rejoin very short fragments
  const merged: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length < 4 && merged.length > 0) {
      merged[merged.length - 1] += " " + part;
    } else {
      merged.push(part);
    }
  }

  return merged;
}

interface ParsedNode {
  type: "paragraph" | "heading1" | "heading2" | "heading3" | "blockquote" | "hr";
  text: string;
  align?: "left" | "center" | "right";
  runs: { text: string; bold?: boolean; italic?: boolean; underline?: boolean }[];
}

function parseInlineHtml(html: string): { text: string; bold?: boolean; italic?: boolean; underline?: boolean }[] {
  const runs: { text: string; bold?: boolean; italic?: boolean; underline?: boolean }[] = [];

  let remaining = html;

  remaining = remaining
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, content) => {
      const text = stripTags(content);
      if (text) runs.push({ text, bold: true });
      return "";
    })
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, content) => {
      const text = stripTags(content);
      if (text) runs.push({ text, bold: true });
      return "";
    })
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, content) => {
      const text = stripTags(content);
      if (text) runs.push({ text, italic: true });
      return "";
    })
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, content) => {
      const text = stripTags(content);
      if (text) runs.push({ text, italic: true });
      return "";
    })
    .replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, (_, content) => {
      const text = stripTags(content);
      if (text) runs.push({ text, underline: true });
      return "";
    });

  const plainText = stripTags(remaining);
  if (plainText) runs.unshift({ text: plainText });

  return runs.length > 0 ? runs : [{ text: "" }];
}

function parseHtmlToNodes(html: string): ParsedNode[] {
  if (!html) return [];

  const nodes: ParsedNode[] = [];

  const pTagCount = (html.match(/<p[^>]*>/gi) ?? []).length;
  const contentLength = html.replace(/<[^>]+>/g, "").length;
  const avgParagraphLength = contentLength / Math.max(pTagCount, 1);
  const needsSplitting = avgParagraphLength > 400;

  const blockRegex = /<(h[1-6]|p|blockquote|hr)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  const matches = Array.from(html.matchAll(blockRegex));

  if (matches.length === 0) {
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
        runs: parseInlineHtml(inner).length > 1
          ? parseInlineHtml(inner)
          : [{ text: trimmed }],
      });
    }
  }

  return nodes;
}

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
          font: "Times New Roman",
          size: 36,
        })),
      });

    case "heading2":
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment,
        spacing: { before: 360, after: 120 },
        children: node.runs.map((r) => new TextRun({
          text: r.text,
          bold: r.bold ?? true,
          italics: r.italic,
          font: "Times New Roman",
          size: 28,
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
          font: "Times New Roman",
          size: 24,
        })),
      });

    case "hr":
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 },
        children: [new TextRun({
          text: "* * *",
          font: "Times New Roman",
          size: 24,
        })],
      });

    case "blockquote":
      return new Paragraph({
        indent: { left: 720 },
        spacing: { before: 120, after: 120 },
        children: node.runs.map((r) => new TextRun({
          text: r.text,
          italics: true,
          font: "Times New Roman",
          size: 24,
        })),
      });

    default: {
      const indent = isFirst ? undefined : { firstLine: 720 };
      return new Paragraph({
        alignment,
        indent,
        spacing: { before: 0, after: 0, line: 480, lineRule: "auto" as any },
        children: node.runs.map((r) => new TextRun({
          text: r.text,
          bold: r.bold,
          italics: r.italic,
          underline: r.underline ? {} : undefined,
          font: "Times New Roman",
          size: 24,
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

    console.log("DOCX export for:", doc.title, "content length:", doc.content?.length);

    const nodes = parseHtmlToNodes(doc.content ?? "");
    console.log("Parsed nodes:", nodes.length);

    const docxParagraphs: Paragraph[] = [];
    let isFirstAfterHeading = true;

    for (const node of nodes) {
      if (
        node.type === "heading1" ||
        node.type === "heading2" ||
        node.type === "heading3"
      ) {
        isFirstAfterHeading = true;
      }

      docxParagraphs.push(nodeToDocxParagraph(node, isFirstAfterHeading));

      if (node.type === "paragraph" || node.type === "blockquote") {
        isFirstAfterHeading = false;
      }
    }

    if (docxParagraphs.length === 0) {
      docxParagraphs.push(new Paragraph({
        children: [new TextRun({ text: "", font: "Times New Roman", size: 24 })],
      }));
    }

    const document = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 24,
            },
            paragraph: {
              spacing: { line: 480, lineRule: "auto" as any },
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 12240,
                height: 15840,
              },
              margin: {
                top: 1440,
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