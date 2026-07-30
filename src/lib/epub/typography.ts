export interface EpubSettings {
  chapterStyle:
    | "classic" | "minimal" | "ornate" | "modern" | "dark" | "contemporary"
    | "elegant" | "bold" | "vintage" | "romantic" | "thriller" | "literary";
  bodyFont: "palatino" | "garamond" | "crimson" | "baskerville" | "source-serif";
  sceneBreak: "dots" | "stars" | "fleuron" | "dingbat" | "line" | "diamond";
  chapterNumbers: "word" | "arabic" | "roman" | "none";
  dropCap: boolean;
  lineHeight: "tight" | "normal" | "loose";
  fontSize: "small" | "medium" | "large";
}

export const DEFAULT_SETTINGS: EpubSettings = {
  chapterStyle: "classic",
  bodyFont: "garamond",
  sceneBreak: "fleuron",
  chapterNumbers: "word",
  dropCap: true,
  lineHeight: "normal",
  fontSize: "medium",
};

// ── Number to word conversion ──────────────────────────

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
  "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

export function numberToWord(n: number): string {
  if (n <= 0 || n > 99) return String(n);
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
}

export function numberToRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

export function formatChapterNumber(n: number, style: EpubSettings["chapterNumbers"]): string {
  switch (style) {
    case "word":    return numberToWord(n);
    case "roman":   return numberToRoman(n);
    case "arabic":  return String(n);
    case "none":    return "";
  }
}

// ── Scene break ornaments ──────────────────────────────

export const SCENE_BREAK_CHARS: Record<EpubSettings["sceneBreak"], string> = {
  dots:    "· · ·",
  stars:   "⁂",
  fleuron: "❧",
  dingbat: "✦",
  line:    "⸻",
  diamond: "◆",
};

// ── Font definitions ────────────────────────────────────

export interface FontDef {
  label: string;
  stack: string;
  googleFamily: string;
}

export const FONTS: Record<EpubSettings["bodyFont"], FontDef> = {
  palatino: {
    label: "Palatino",
    stack: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
    googleFamily: "",
  },
  garamond: {
    label: "EB Garamond",
    stack: '"EB Garamond", Garamond, Georgia, serif',
    googleFamily: "EB+Garamond:ital,wght@0,400;0,500;1,400",
  },
  crimson: {
    label: "Crimson Text",
    stack: '"Crimson Text", Georgia, serif',
    googleFamily: "Crimson+Text:ital,wght@0,400;0,600;1,400",
  },
  baskerville: {
    label: "Libre Baskerville",
    stack: '"Libre Baskerville", Baskerville, Georgia, serif',
    googleFamily: "Libre+Baskerville:ital,wght@0,400;0,700;1,400",
  },
  "source-serif": {
    label: "Source Serif",
    stack: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
    googleFamily: "Source+Serif+4:ital,wght@0,400;0,600;1,400",
  },
};

// ── Line height values ─────────────────────────────────

export const LINE_HEIGHTS: Record<EpubSettings["lineHeight"], string> = {
  tight:  "1.6",
  normal: "1.8",
  loose:  "2.0",
};

// ── Font sizes ─────────────────────────────────────────

export const FONT_SIZES: Record<EpubSettings["fontSize"], string> = {
  small:  "0.9em",
  medium: "1em",
  large:  "1.1em",
};

// ── CSS generator ──────────────────────────────────────

export function generateCSS(settings: EpubSettings): string {
  const font = FONTS[settings.bodyFont];
  const lineHeight = LINE_HEIGHTS[settings.lineHeight];
  const fontSize = FONT_SIZES[settings.fontSize];

  return `
/* ── Reset ── */
* { margin: 0; padding: 0; box-sizing: border-box; }

/* ── Body ── */
body {
  font-family: ${font.stack};
  font-size: ${fontSize};
  line-height: ${lineHeight};
  color: #1a1a1a;
  -webkit-hyphens: auto;
  -epub-hyphens: auto;
  hyphens: auto;
  orphans: 2;
  widows: 2;
}

/* ── Paragraphs — book style ── */
p {
  margin: 0;
  padding: 0;
  text-indent: 1.5em;
}

/* First paragraph — no indent */
h1 + p,
h2 + p,
h3 + p,
.scene-break + p,
.chapter-heading + p,
p.no-indent,
p:first-of-type {
  text-indent: 0;
}

/* ── Drop cap ── */
// Replace the drop cap CSS with:
${settings.dropCap ? `
.drop-cap::first-letter,
p.drop-cap::first-letter {
  font-size: 3em;
  font-weight: bold;
  float: left;
  line-height: 0.8;
  margin: 0.1em 0.12em 0 0;
  padding: 0;
  font-family: ${font.stack};
}
` : ""}

/* ── Headings ── */
h1, h2, h3 {
  font-family: ${font.stack};
  font-weight: bold;
  text-align: center;
  margin: 0;
  padding: 0;
}

/* ── Scene break ── */
.scene-break {
  text-align: center;
  margin: 1.5em 0;
  font-size: 1.1em;
  letter-spacing: 0.3em;
}

/* ── Chapter heading styles ── */

/* Classic */
.chapter-heading.classic {
  text-align: center;
  margin-bottom: 3em;
  padding-top: 15%;
  page-break-before: always;
}
.chapter-heading.classic .chapter-label {
  font-size: 0.75em;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  text-indent: 0;
  margin-bottom: 0.75em;
  color: #444;
}
.chapter-heading.classic .chapter-title {
  font-size: 1.6em;
  letter-spacing: 0.05em;
  margin-bottom: 1em;
}
.chapter-heading.classic .chapter-rule {
  width: 3em;
  height: 1px;
  background: #1a1a1a;
  margin: 0 auto;
}

/* Minimal */
.chapter-heading.minimal {
  text-align: center;
  padding-top: 20%;
  margin-bottom: 4em;
  page-break-before: always;
}
.chapter-heading.minimal .chapter-number {
  font-size: 2.5em;
  font-weight: 300;
  letter-spacing: 0.1em;
  text-indent: 0;
  color: #333;
}
.chapter-heading.minimal .chapter-title {
  font-size: 1em;
  font-weight: normal;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-top: 0.5em;
  color: #555;
}

/* Ornate */
.chapter-heading.ornate {
  text-align: center;
  padding-top: 15%;
  margin-bottom: 3em;
  page-break-before: always;
}
.chapter-heading.ornate .ornament {
  font-size: 1.5em;
  color: #555;
  text-indent: 0;
  line-height: 1;
  margin: 0.5em 0;
}
.chapter-heading.ornate .chapter-label {
  font-size: 0.7em;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-indent: 0;
  color: #666;
  margin-bottom: 0.5em;
}
.chapter-heading.ornate .chapter-title {
  font-size: 1.5em;
  font-style: italic;
  margin: 0.25em 0;
}

/* Modern */
.chapter-heading.modern {
  text-align: center;
  padding-top: 18%;
  margin-bottom: 3.5em;
  page-break-before: always;
}
.chapter-heading.modern .chapter-lines {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75em;
  margin-bottom: 0.75em;
}
.chapter-heading.modern .chapter-line {
  width: 2em;
  height: 1px;
  background: #1a1a1a;
  display: inline-block;
}
.chapter-heading.modern .chapter-title {
  font-size: 1.4em;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  font-weight: bold;
}
.chapter-heading.modern .chapter-subtitle {
  font-size: 0.8em;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #666;
  margin-top: 0.5em;
  font-weight: normal;
  text-indent: 0;
}

/* Dark */
.chapter-heading.dark {
  text-align: center;
  padding-top: 20%;
  margin-bottom: 4em;
  page-break-before: always;
}
.chapter-heading.dark .chapter-label {
  font-size: 0.85em;
  letter-spacing: 0.3em;
  color: #555;
  text-indent: 0;
  margin-bottom: 0.75em;
  font-style: italic;
}
.chapter-heading.dark .chapter-title {
  font-size: 1.8em;
  font-weight: bold;
  letter-spacing: -0.02em;
}

/* Contemporary */
.chapter-heading.contemporary {
  padding-top: 15%;
  margin-bottom: 3em;
  page-break-before: always;
  border-bottom: 1px solid #1a1a1a;
  padding-bottom: 1em;
}
.chapter-heading.contemporary .chapter-number {
  font-size: 0.7em;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  display: block;
  text-indent: 0;
  color: #666;
  margin-bottom: 0.25em;
}
.chapter-heading.contemporary .chapter-title {
  font-size: 1.4em;
  text-align: left;
  letter-spacing: -0.01em;
}

/* ── Blockquote ── */
blockquote {
  margin: 1.5em 2em;
  font-style: italic;
  border-left: 2px solid #ccc;
  padding-left: 1em;
}

// Add to the return string inside generateCSS():

/* Elegant */
.chapter-heading.elegant {
  text-align: center;
  padding-top: 15%;
  margin-bottom: 3em;
  page-break-before: always;
}
.chapter-heading.elegant .elegant-top-line,
.chapter-heading.elegant .elegant-bottom-line {
  width: 6em;
  margin: 0.75em auto;
  border: none;
  height: 0;
  border-top: 1px solid #1a1a1a;
}
.chapter-heading.elegant .chapter-label {
  font-size: 0.7em;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  text-indent: 0;
  color: #555;
}
.chapter-heading.elegant .chapter-title {
  font-size: 1.5em;
  font-style: italic;
  font-weight: normal;
  letter-spacing: 0.05em;
}

/* Bold */
.chapter-heading.bold-style {
  text-align: center;
  padding-top: 18%;
  margin-bottom: 3em;
  page-break-before: always;
  border-top: 3px solid #1a1a1a;
  padding-top: 1.5em;
  margin-top: 15%;
}
.chapter-heading.bold-style .chapter-number {
  font-size: 0.7em;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  text-indent: 0;
  color: #555;
  margin-bottom: 0.25em;
}
.chapter-heading.bold-style .chapter-title {
  font-size: 2em;
  font-weight: 900;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

/* Vintage */
.chapter-heading.vintage {
  text-align: center;
  padding-top: 15%;
  margin-bottom: 3em;
  page-break-before: always;
}
.chapter-heading.vintage .vintage-ornament {
  font-size: 1em;
  color: #555;
  letter-spacing: 0.2em;
  text-indent: 0;
  margin: 0.5em 0;
}
.chapter-heading.vintage .chapter-label {
  font-size: 0.75em;
  letter-spacing: 0.1em;
  text-indent: 0;
  font-style: italic;
  color: #555;
  margin-bottom: 0.5em;
}
.chapter-heading.vintage .chapter-title {
  font-size: 1.6em;
  font-weight: bold;
}

/* Romantic */
.chapter-heading.romantic {
  text-align: center;
  padding-top: 15%;
  margin-bottom: 3em;
  page-break-before: always;
}
.chapter-heading.romantic .chapter-title {
  font-size: 1.8em;
  font-style: italic;
  font-weight: normal;
  margin-bottom: 0.25em;
}
.chapter-heading.romantic .chapter-label {
  font-size: 0.7em;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  text-indent: 0;
  color: #666;
  margin-bottom: 0.75em;
}
.chapter-heading.romantic .romantic-flourish {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  margin-top: 0.75em;
}
.chapter-heading.romantic .romantic-line {
  width: 3em;
  height: 1px;
  background: #1a1a1a;
  display: inline-block;
}
.chapter-heading.romantic .romantic-flourish span {
  font-size: 0.6em;
  color: #555;
}

/* Thriller */
.chapter-heading.thriller {
  padding-top: 20%;
  margin-bottom: 3em;
  page-break-before: always;
}
.chapter-heading.thriller .thriller-bar {
  width: 100%;
  height: 4px;
  background: #1a1a1a;
  margin-bottom: 1em;
}
.chapter-heading.thriller .chapter-number {
  font-size: 0.7em;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  text-indent: 0;
  color: #555;
  margin-bottom: 0.25em;
}
.chapter-heading.thriller .chapter-title {
  font-size: 1.6em;
  font-weight: 900;
  text-align: left;
  letter-spacing: -0.02em;
}

/* Literary */
.chapter-heading.literary {
  padding-top: 18%;
  margin-bottom: 4em;
  page-break-before: always;
  text-align: left;
  border-bottom: 1px solid #ccc;
  padding-bottom: 1.5em;
}
.chapter-heading.literary .chapter-label {
  font-size: 0.65em;
  letter-spacing: 0.5em;
  text-indent: 0;
  color: #888;
  margin-bottom: 0.5em;
}
.chapter-heading.literary .chapter-title {
  font-size: 1.5em;
  font-weight: normal;
  font-style: italic;
  text-align: left;
  letter-spacing: 0.02em;
}

/* ── Bold / Italic ── */
strong { font-weight: bold; }
em { font-style: italic; }



/* ── Page breaks ── */
.page-break { page-break-after: always; }
`;
}

// ── Chapter heading HTML generator ────────────────────

export function generateChapterHeading(
  chapterNumber: number,
  chapterTitle: string,
  settings: EpubSettings
): string {
  const numStr = formatChapterNumber(chapterNumber, settings.chapterNumbers);
  const sceneChar = SCENE_BREAK_CHARS[settings.sceneBreak];

  switch (settings.chapterStyle) {
    case "classic":
      return `
<div class="chapter-heading classic">
  ${numStr ? `<p class="chapter-label">Chapter ${numStr}</p>` : ""}
  ${chapterTitle ? `<h1 class="chapter-title">${chapterTitle}</h1>` : ""}
  <div class="chapter-rule"></div>
</div>`;

    case "minimal":
      return `
<div class="chapter-heading minimal">
  ${numStr ? `<p class="chapter-number">${numStr}</p>` : ""}
  ${chapterTitle ? `<h1 class="chapter-title">${chapterTitle}</h1>` : ""}
</div>`;

    case "ornate":
      return `
<div class="chapter-heading ornate">
  <p class="ornament">${sceneChar}</p>
  ${numStr ? `<p class="chapter-label">Chapter ${numStr}</p>` : ""}
  ${chapterTitle ? `<h1 class="chapter-title">${chapterTitle}</h1>` : ""}
  <p class="ornament">${sceneChar}</p>
</div>`;

    case "modern":
      return `
<div class="chapter-heading modern">
  <h1 class="chapter-title">${numStr || chapterTitle}</h1>
  ${numStr && chapterTitle ? `<p class="chapter-subtitle">${chapterTitle}</p>` : ""}
  <div class="chapter-lines">
    <span class="chapter-line"></span>
    <span class="chapter-line"></span>
  </div>
</div>`;

    case "dark":
      return `
<div class="chapter-heading dark">
  ${numStr ? `<p class="chapter-label">— ${numStr.toLowerCase()} —</p>` : ""}
  ${chapterTitle ? `<h1 class="chapter-title">${chapterTitle}</h1>` : ""}
</div>`;

    case "contemporary":
      return `
<div class="chapter-heading contemporary">
  ${numStr ? `<span class="chapter-number">Chapter ${numStr}</span>` : ""}
  ${chapterTitle ? `<h1 class="chapter-title">${chapterTitle}</h1>` : ""}
</div>`;

case "elegant":
  return `
<div class="chapter-heading elegant">
  <div class="elegant-top-line"></div>
  ${numStr ? `<p class="chapter-label">${numStr}</p>` : ""}
  ${chapterTitle ? `<h1 class="chapter-title">${chapterTitle}</h1>` : ""}
  <div class="elegant-bottom-line"></div>
</div>`;

case "bold":
  return `
<div class="chapter-heading bold-style">
  ${numStr ? `<p class="chapter-number">${numStr}</p>` : ""}
  ${chapterTitle ? `<h1 class="chapter-title">${chapterTitle}</h1>` : ""}
</div>`;

case "vintage":
  return `
<div class="chapter-heading vintage">
  <p class="vintage-ornament">— ${sceneChar} —</p>
  ${numStr ? `<p class="chapter-label">Chapter the ${numStr}</p>` : ""}
  ${chapterTitle ? `<h1 class="chapter-title">${chapterTitle}</h1>` : ""}
  <p class="vintage-ornament">— ${sceneChar} —</p>
</div>`;

case "romantic":
  return `
<div class="chapter-heading romantic" style="text-align:center;padding-top:15%;margin-bottom:3em;page-break-before:always;">
  ${chapterTitle ? `<h1 style="font-size:1.8em;font-style:italic;font-weight:normal;margin:0 0 0.25em;">${chapterTitle}</h1>` : ""}
  ${numStr ? `<p style="font-size:0.7em;letter-spacing:0.25em;text-transform:uppercase;color:#666;margin:0 0 0.75em;text-indent:0;">${numStr}</p>` : ""}
  <div style="display:flex;align-items:center;justify-content:center;gap:0.5em;margin-top:0.75em;">
    <span style="font-size:0.6em;color:#555;">✦</span>
    <div style="width:3em;height:1px;background:#1a1a1a;display:inline-block;"></div>
    <span style="font-size:0.6em;color:#555;">✦</span>
  </div>
</div>`;

case "thriller":
  return `
<div class="chapter-heading thriller">
  <div class="thriller-bar"></div>
  ${numStr ? `<p class="chapter-number">${numStr}</p>` : ""}
  ${chapterTitle ? `<h1 class="chapter-title">${chapterTitle}</h1>` : ""}
</div>`;

case "literary":
  return `
<div class="chapter-heading literary">
  ${numStr ? `<p class="chapter-label">${numStr.toUpperCase()}</p>` : ""}
  ${chapterTitle ? `<h1 class="chapter-title">${chapterTitle}</h1>` : ""}
</div>`;

    default:
      return `<h1>${chapterTitle}</h1>`;
  }
}

// ── Content processor ──────────────────────────────────

export function processContent(html: string, settings: EpubSettings): string {
  if (!html) return "<p></p>";

  const sceneBreakChar = SCENE_BREAK_CHARS[settings.sceneBreak];

  return html
    // Fix br inside p — convert to paragraph breaks instead
    .replace(/<p([^>]*)>(.*?)<br\s*\/?>(.*?)<\/p>/gi, (_, attrs, before, after) => {
      const parts = [before, after].filter((p) => p.trim());
      return parts.map((p) => `<p${attrs}>${p}</p>`).join("\n");
    })
    // Remove standalone br tags
    .replace(/<br\s*\/?>/gi, "</p><p>")
    // Scene breaks
    .replace(/<hr\s*\/?>/gi, `<p class="scene-break">${sceneBreakChar}</p>`)
    // Smart quotes
    .replace(/(\s|^)"(\S)/g, "$1\u201c$2")
    .replace(/(\S)"(\s|$|[.,!?;:])/g, "$1\u201d$2")
    .replace(/(\s|^)'(\S)/g, "$1\u2018$2")
    .replace(/(\S)'(\s|$|[.,!?;:])/g, "$1\u2019$2")
    // Em dashes
    .replace(/--/g, "\u2014")
    // Ellipsis
    .replace(/\.\.\./g, "\u2026")
    // Clean empty paragraphs
    .replace(/<p>\s*<\/p>/g, '<p class="no-indent">&nbsp;</p>')
    // Fix any remaining br tags inside p
    .replace(/<p([^>]*)>\s*<br\s*\/?>\s*<\/p>/gi, '<p$1>&nbsp;</p>')
    .trim();
}