import {
  AlignmentType, Document, Footer, Header, LineRuleType, Packer, PageNumber,
  Paragraph, TabStopType, TextRun, type IParagraphOptions,
} from "docx";
import { firstLineIndents, htmlToBlocks, type Block, type Run } from "@/lib/export/htmlBlocks";
import {
  approximateWordCount, marginsFor,
  type ExportBook, type ExportOptions, type FontId,
} from "@/lib/export/presets";

const TWIP = 1440; // twips per inch

// Word can't embed the web fonts, so DOCX uses the closest common system face.
const DOCX_FONT: Record<FontId, string> = {
  garamond: "Garamond",
  baskerville: "Baskerville Old Face",
  crimson: "Georgia",
  courier: "Courier New",
  times: "Times New Roman",
};

const ALIGN = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const;

const runsToDocx = (runs: Run[]) =>
  runs.flatMap((r) =>
    r.text.split("\n").map(
      (part, i) =>
        new TextRun({
          text: part,
          bold: r.bold,
          italics: r.italic,
          underline: r.underline ? {} : undefined,
          break: i > 0 ? 1 : undefined,
        }),
    ),
  );

export async function renderManuscriptDocx(book: ExportBook, opts: ExportOptions): Promise<Buffer> {
  const { preset } = opts;
  const manuscript = preset.kind === "manuscript";
  const m = marginsFor(preset, book.wordCount);
  const size = preset.fontSize * 2; // half-points
  const line = manuscript ? 480 : 336; // 240 = single spacing
  const indent = manuscript ? 0.5 * TWIP : 0.25 * TWIP;
  const sceneBreak = manuscript ? "#" : "*   *   *";
  const contentHeightTw = (preset.height - m.top - m.bottom) * TWIP;
  const author = opts.author.trim();
  const surname = author.split(/\s+/).pop() ?? "";
  const shortTitle = book.title.length > 30 ? `${book.title.slice(0, 30).trim()}…` : book.title;

  const centered = (text: string, extra: Partial<IParagraphOptions> = {}, run: Partial<ConstructorParameters<typeof TextRun>[0] & object> = {}) =>
    new Paragraph({ alignment: AlignmentType.CENTER, ...extra, children: [new TextRun({ text, ...run })] });

  const blocksToParagraphs = (blocks: Block[]): Paragraph[] => {
    const indents = firstLineIndents(blocks);
    return blocks.map((b, i) => {
      if (b.type === "sceneBreak") {
        return centered(sceneBreak, { spacing: { before: manuscript ? 0 : 160, after: manuscript ? 0 : 160 } });
      }
      if (b.type === "h1" || b.type === "h2" || b.type === "h3") {
        return new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 240, after: 120 }, children: runsToDocx(b.runs.map((r) => ({ ...r, bold: true }))) });
      }
      const firstLine = indents[i] ? indent : 0;
      const quoteOrList = b.type === "quote" || b.type === "li";
      return new Paragraph({
        alignment: ALIGN[b.align ?? (manuscript || quoteOrList ? "left" : "justify")],
        indent: quoteOrList ? { left: indent, right: b.type === "quote" ? indent : 0 } : { firstLine },
        children: [
          ...(b.type === "li" && b.marker ? [new TextRun(`${b.marker} `)] : []),
          ...runsToDocx(b.runs),
        ],
      });
    });
  };

  // A printed chapter = a level-1 chapter plus the scenes that follow it.
  const body: Paragraph[] = [];
  let firstChapter = true;
  for (const ch of book.chapters) {
    if (ch.level === 1 || firstChapter) {
      body.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          pageBreakBefore: !firstChapter || opts.frontMatter,
          // Push the chapter title down the page (≈ a quarter/third).
          spacing: { before: Math.round(contentHeightTw * (manuscript ? 0.3 : 0.22)), after: manuscript ? 0 : 480 },
          keepNext: true,
          children: [new TextRun({ text: manuscript ? ch.title.toUpperCase() : ch.title, bold: !manuscript, size: manuscript ? size : Math.round(size * 1.6) })],
        }),
      );
      firstChapter = false;
    } else {
      body.push(
        ch.title && opts.sceneTitles
          ? centered(ch.title, { keepNext: true, spacing: { before: 240, after: 120 } }, { italics: true })
          : centered(sceneBreak, { spacing: { before: manuscript ? 0 : 160, after: manuscript ? 0 : 160 } }),
      );
    }
    body.push(...blocksToParagraphs(htmlToBlocks(ch.html)));
  }

  const front: Paragraph[] = [];
  if (opts.frontMatter && manuscript) {
    const contact = [author, ...opts.contact.split("\n")].map((s) => s.trim()).filter(Boolean);
    const rightTab = (preset.width - m.inside - m.outside) * TWIP;
    contact.forEach((lineText, i) =>
      front.push(new Paragraph({
        spacing: { line: 240, lineRule: LineRuleType.AUTO },
        tabStops: [{ type: TabStopType.RIGHT, position: rightTab }],
        children: [new TextRun(lineText), ...(i === 0 ? [new TextRun({ text: `\t${approximateWordCount(book.wordCount)}` })] : [])],
      })),
    );
    if (contact.length === 0) {
      front.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(approximateWordCount(book.wordCount))] }));
    }
    front.push(centered(book.title.toUpperCase(), { spacing: { before: Math.round(contentHeightTw * 0.35) } }));
    if (author) front.push(centered(`by ${author}`));
  } else if (opts.frontMatter) {
    front.push(centered(book.title, { spacing: { before: Math.round(contentHeightTw * 0.28), line: 300 } }, { size: Math.round(size * 2.3) }));
    if (author) front.push(centered(author, { spacing: { before: 480 } }, { size: Math.round(size * 1.3) }));
    const copyright = [
      book.title,
      `Copyright © ${new Date().getFullYear()} ${author || "the author"}`,
      "",
      "All rights reserved. No part of this book may be reproduced in any form without written permission from the author, except for brief quotations in reviews.",
      "",
      "This is a work of fiction. Names, characters, places and incidents are the product of the author's imagination or are used fictitiously.",
    ];
    copyright.forEach((text, i) =>
      front.push(new Paragraph({
        pageBreakBefore: i === 0,
        spacing: { before: i === 0 ? Math.round(contentHeightTw * 0.65) : 0, line: 300 },
        children: [new TextRun({ text, size: size - 4 })],
      })),
    );
  }

  const pageNumberRun = new TextRun({ children: [PageNumber.CURRENT] });
  const doc = new Document({
    creator: author || "Prosr",
    title: book.title,
    styles: {
      default: {
        document: {
          run: { font: DOCX_FONT[opts.font], size },
          paragraph: { spacing: { line, lineRule: LineRuleType.AUTO, before: 0, after: 0 } },
        },
      },
    },
    sections: [{
      properties: {
        titlePage: opts.frontMatter,
        page: {
          size: { width: Math.round(preset.width * TWIP), height: Math.round(preset.height * TWIP) },
          margin: {
            top: Math.round(m.top * TWIP),
            bottom: Math.round(m.bottom * TWIP),
            left: Math.round(m.inside * TWIP),
            right: Math.round(m.outside * TWIP),
            header: Math.round(0.5 * TWIP),
            footer: Math.round(0.35 * TWIP),
          },
        },
      },
      headers: manuscript
        ? {
            default: new Header({
              children: [new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { line: 240 },
                children: [new TextRun(`${surname ? `${surname} / ` : ""}${shortTitle} / `), pageNumberRun],
              })],
            }),
            first: new Header({ children: [] }),
          }
        : undefined,
      footers: manuscript
        ? undefined
        : {
            default: new Footer({
              children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240 }, children: [new TextRun({ children: [PageNumber.CURRENT], size: size - 3 })] })],
            }),
            first: new Footer({ children: [] }),
          },
      children: [...front, ...body],
    }],
  });

  return Packer.toBuffer(doc);
}
