import path from "node:path";
import { Document, Font, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { firstLineIndents, htmlToBlocks, type Block, type Run } from "@/lib/export/htmlBlocks";
import {
  approximateWordCount, marginsFor,
  type ExportBook, type ExportOptions, type FontId,
} from "@/lib/export/presets";

const PT = 72; // points per inch

// KDP requires embedded fonts, so book faces are registered from the bundled
// @fontsource files. Courier/Times are PDF standard fonts (manuscript format).
const EMBEDDED: Partial<Record<FontId, { family: string; pkg: string }>> = {
  garamond: { family: "EB Garamond", pkg: "eb-garamond" },
  baskerville: { family: "Libre Baskerville", pkg: "libre-baskerville" },
  crimson: { family: "Crimson Text", pkg: "crimson-text" },
};
const STANDARD: Partial<Record<FontId, string>> = { courier: "Courier", times: "Times-Roman" };

let registered = false;
function registerFonts() {
  if (registered) return;
  registered = true;
  for (const { family, pkg } of Object.values(EMBEDDED)) {
    const file = (weight: number, style: string) =>
      path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", `${pkg}-latin-${weight}-${style}.woff`);
    Font.register({
      family,
      fonts: [
        { src: file(400, "normal") },
        { src: file(400, "italic"), fontStyle: "italic" },
        { src: file(700, "normal"), fontWeight: 700 },
        { src: file(700, "italic"), fontWeight: 700, fontStyle: "italic" },
      ],
    });
  }
}

const fontFamily = (id: FontId) => EMBEDDED[id]?.family ?? STANDARD[id] ?? "Times-Roman";

function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text
          key={i}
          style={{
            fontWeight: r.bold ? 700 : 400,
            fontStyle: r.italic ? "italic" : "normal",
            textDecoration: r.underline ? "underline" : "none",
          }}>
          {r.text}
        </Text>
      ))}
    </>
  );
}

interface Theme {
  manuscript: boolean;
  fontSize: number;
  lineHeight: number;
  indent: number;
  sceneBreak: string;
}

function Blocks({ blocks, theme }: { blocks: Block[]; theme: Theme }) {
  const indents = firstLineIndents(blocks);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "sceneBreak") {
          return (
            <Text key={i} style={{ textAlign: "center", marginVertical: theme.manuscript ? 0 : theme.fontSize * 0.8 }}>
              {theme.sceneBreak}
            </Text>
          );
        }
        if (b.type === "h1" || b.type === "h2" || b.type === "h3") {
          return (
            <Text key={i} minPresenceAhead={theme.fontSize * 4} style={{ textAlign: "center", fontWeight: 700, fontSize: theme.fontSize * (b.type === "h3" ? 1 : 1.15), marginTop: theme.fontSize, marginBottom: theme.fontSize * 0.6 }}>
              <Runs runs={b.runs} />
            </Text>
          );
        }
        const style: Style = {
          textIndent: indents[i] ? theme.indent : 0,
          textAlign: b.align ?? (theme.manuscript ? "left" : "justify"),
        };
        if (b.type === "quote") Object.assign(style, { marginHorizontal: theme.indent, marginVertical: theme.fontSize * 0.4, textIndent: 0 });
        if (b.type === "li") Object.assign(style, { marginLeft: theme.indent, textIndent: 0, textAlign: "left" });
        return (
          <Text key={i} style={style}>
            {/* react-pdf only applies textIndent when the first child is a
                plain string, so always lead with one. */}
            {b.type === "li" && b.marker ? `${b.marker} ` : " "}
            <Runs runs={b.runs} />
          </Text>
        );
      })}
    </>
  );
}

export async function renderManuscriptPdf(book: ExportBook, opts: ExportOptions): Promise<Buffer> {
  registerFonts();
  const { preset } = opts;
  const manuscript = preset.kind === "manuscript";
  const m = marginsFor(preset, book.wordCount);
  const size: [number, number] = [preset.width * PT, preset.height * PT];
  const contentHeight = (preset.height - m.top - m.bottom) * PT;
  const theme: Theme = {
    manuscript,
    fontSize: preset.fontSize,
    lineHeight: manuscript ? 2 : 1.4,
    indent: manuscript ? 0.5 * PT : 0.25 * PT,
    sceneBreak: manuscript ? "#" : "*   *   *",
  };
  const pageStyle: Style = {
    paddingTop: m.top * PT,
    paddingBottom: m.bottom * PT,
    paddingLeft: m.inside * PT,
    paddingRight: m.outside * PT,
    fontFamily: fontFamily(opts.font),
    fontSize: theme.fontSize,
    lineHeight: theme.lineHeight,
    color: "#000",
  };
  const author = opts.author.trim();
  const surname = author.split(/\s+/).pop() ?? "";
  const shortTitle = book.title.length > 30 ? `${book.title.slice(0, 30).trim()}…` : book.title;

  // A printed chapter = a level-1 chapter plus the scenes that follow it.
  const printed: { title: string; parts: { title: string | null; html: string }[] }[] = [];
  for (const ch of book.chapters) {
    if (ch.level === 1 || printed.length === 0) printed.push({ title: ch.title, parts: [{ title: null, html: ch.html }] });
    else printed[printed.length - 1].parts.push({ title: ch.title, html: ch.html });
  }

  const pageNumber = manuscript ? (
    <Text
      fixed
      style={{ position: "absolute", top: 0.5 * PT, right: m.outside * PT, fontSize: theme.fontSize }}
      render={({ pageNumber: n }) => (n > 1 || !opts.frontMatter ? `${surname ? `${surname} / ` : ""}${shortTitle} / ${n}` : "")}
    />
  ) : (
    <Text
      fixed
      // Anchored from the top: react-pdf drops bottom-anchored fixed render()
      // text when the Page sets a lineHeight.
      style={{ position: "absolute", top: size[1] - (m.bottom * PT) / 2 - theme.fontSize, left: 0, right: 0, textAlign: "center", fontSize: theme.fontSize - 1.5 }}
      render={({ pageNumber: n }) => `${n}`}
    />
  );

  const doc = (
    <Document title={book.title} author={author || undefined} creator="Prosr" producer="Prosr">
      {opts.frontMatter && manuscript && (
        <Page size={size} style={pageStyle}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", lineHeight: 1.2 }}>
            <Text>{[author, opts.contact.trim()].filter(Boolean).join("\n")}</Text>
            <Text>{approximateWordCount(book.wordCount)}</Text>
          </View>
          <View style={{ marginTop: contentHeight * 0.35, alignItems: "center" }}>
            <Text style={{ textTransform: "uppercase" }}>{book.title}</Text>
            {author && <Text>by {author}</Text>}
          </View>
        </Page>
      )}
      {opts.frontMatter && !manuscript && (
        <>
          <Page size={size} style={pageStyle}>
            <View style={{ marginTop: contentHeight * 0.28, alignItems: "center" }}>
              <Text style={{ fontSize: theme.fontSize * 2.3, lineHeight: 1.2, textAlign: "center" }}>{book.title}</Text>
              {author && <Text style={{ fontSize: theme.fontSize * 1.3, marginTop: theme.fontSize * 2 }}>{author}</Text>}
            </View>
          </Page>
          <Page size={size} style={pageStyle}>
            <View style={{ marginTop: contentHeight * 0.7, fontSize: theme.fontSize - 2, lineHeight: 1.5 }}>
              <Text>{book.title}</Text>
              <Text>Copyright © {new Date().getFullYear()} {author || "the author"}</Text>
              <Text style={{ marginTop: theme.fontSize }}>
                All rights reserved. No part of this book may be reproduced in any form without written permission from the author, except for brief quotations in reviews.
              </Text>
              <Text style={{ marginTop: theme.fontSize }}>
                This is a work of fiction. Names, characters, places and incidents are the product of the author&apos;s imagination or are used fictitiously.
              </Text>
            </View>
          </Page>
        </>
      )}
      {printed.map((chapter, ci) => (
        <Page key={ci} size={size} style={pageStyle} wrap>
          <View style={{ height: contentHeight * (manuscript ? 0.3 : 0.22) }} />
          <Text style={{ textAlign: "center", fontSize: manuscript ? theme.fontSize : theme.fontSize * 1.6, fontWeight: manuscript ? 400 : 700, marginBottom: manuscript ? 0 : theme.fontSize * 2, lineHeight: manuscript ? 2 : 1.25 }}>
            {manuscript ? chapter.title.toUpperCase() : chapter.title}
          </Text>
          {chapter.parts.map((part, pi) => (
            <View key={pi}>
              {pi > 0 && (part.title && opts.sceneTitles ? (
                <Text minPresenceAhead={theme.fontSize * 4} style={{ textAlign: "center", fontStyle: "italic", marginVertical: theme.fontSize }}>{part.title}</Text>
              ) : (
                <Text style={{ textAlign: "center", marginVertical: manuscript ? 0 : theme.fontSize * 0.8 }}>{theme.sceneBreak}</Text>
              ))}
              <Blocks blocks={htmlToBlocks(part.html)} theme={theme} />
            </View>
          ))}
          {/* After the content so react-pdf draws it on every page. */}
          {pageNumber}
        </Page>
      ))}
    </Document>
  );

  return renderToBuffer(doc);
}
