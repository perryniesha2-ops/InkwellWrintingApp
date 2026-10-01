/**
 * Minimal, dependency-free conversion of editor HTML (Tiptap output) into
 * paragraph blocks with styled text runs, for the PDF and DOCX exporters.
 * Runs on the server, so no DOM.
 */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export type Align = "left" | "center" | "right" | "justify";

export type Block =
  | { type: "p" | "h1" | "h2" | "h3" | "quote" | "li"; runs: Run[]; align?: Align; marker?: string }
  | { type: "sceneBreak" };

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "div"]);

export function htmlToBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  const style = { bold: 0, italic: 0, underline: 0 };
  const lists: { ordered: boolean; n: number }[] = [];
  let quoteDepth = 0;
  let current: Extract<Block, { runs: Run[] }> | null = null;

  const close = () => {
    if (!current) return;
    // Drop leading/trailing whitespace-only runs; keep empty paragraphs out.
    const text = current.runs.map((r) => r.text).join("");
    if (text.trim()) blocks.push(current);
    current = null;
  };
  const open = (type: Extract<Block, { runs: Run[] }>["type"], attrs = "") => {
    close();
    const align = /text-align:\s*(left|center|right|justify)/i.exec(attrs)?.[1]?.toLowerCase() as Align | undefined;
    current = { type: quoteDepth && type === "p" ? "quote" : type, runs: [], align };
  };
  const addText = (text: string) => {
    if (!text) return;
    if (!current) {
      if (!text.trim()) return;
      open("p");
    }
    current!.runs.push({
      text,
      ...(style.bold && { bold: true }),
      ...(style.italic && { italic: true }),
      ...(style.underline && { underline: true }),
    });
  };

  const tokenRe = /<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(html))) {
    const [, closing, rawTag, attrs, text] = m;
    if (text !== undefined) {
      addText(decodeEntities(text).replace(/\s+/g, " "));
      continue;
    }
    const tag = rawTag.toLowerCase();
    const isClose = closing === "/";
    switch (tag) {
      case "strong": case "b": style.bold += isClose ? -1 : 1; break;
      case "em": case "i": style.italic += isClose ? -1 : 1; break;
      case "u": style.underline += isClose ? -1 : 1; break;
      case "br": addText("\n"); break;
      case "hr": close(); blocks.push({ type: "sceneBreak" }); break;
      case "blockquote": close(); quoteDepth += isClose ? -1 : 1; break;
      case "ul": case "ol":
        close();
        if (isClose) lists.pop();
        else lists.push({ ordered: tag === "ol", n: 0 });
        break;
      default:
        if (!BLOCK_TAGS.has(tag)) break;
        if (isClose) { close(); break; }
        if (tag === "li") {
          const list = lists[lists.length - 1];
          open("li", attrs);
          if (list) current!.marker = list.ordered ? `${++list.n}.` : "•";
        } else if (/^h[1-6]$/.test(tag)) {
          open(tag === "h1" ? "h1" : tag === "h2" ? "h2" : "h3", attrs);
        } else if (tag === "p" && !(current && (current as { type: string }).type === "li")) {
          open("p", attrs);
        }
    }
  }
  close();

  // Trim whitespace at block edges.
  for (const b of blocks) {
    if (b.type === "sceneBreak" || !b.runs.length) continue;
    b.runs[0].text = b.runs[0].text.replace(/^[ \t]+/, "");
    const last = b.runs[b.runs.length - 1];
    last.text = last.text.replace(/[ \t]+$/, "");
  }
  return blocks;
}

/**
 * Book convention: indent every body paragraph's first line except the first
 * one after a heading or scene break (and centered/right-aligned ones).
 */
export function firstLineIndents(blocks: Block[]): boolean[] {
  let afterText = false;
  return blocks.map((b) => {
    if (b.type === "sceneBreak" || b.type === "h1" || b.type === "h2" || b.type === "h3") {
      afterText = false;
      return false;
    }
    const indent = afterText && b.type === "p" && (!b.align || b.align === "left" || b.align === "justify");
    afterText = true;
    return indent;
  });
}

export const blockText =(b: Block) => (b.type === "sceneBreak" ? "" : b.runs.map((r) => r.text).join(""));
