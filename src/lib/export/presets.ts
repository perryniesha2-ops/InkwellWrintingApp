/**
 * Print/manuscript export presets.
 *
 * KDP paperback: interior trim sizes from Amazon KDP, inside margin (gutter)
 * sized from the estimated page count per KDP's margin table, no bleed.
 * Standard Manuscript Format: the agent/editor submission format (Letter,
 * 1" margins, 12pt, double spaced, running header).
 */
export type PresetId = "kdp-5x8" | "kdp-5.25x8" | "kdp-5.5x8.5" | "kdp-6x9" | "manuscript";
export type FontId = "garamond" | "baskerville" | "crimson" | "courier" | "times";
export type ExportFormat = "pdf" | "docx";

export interface Preset {
  id: PresetId;
  label: string;
  description: string;
  kind: "kdp" | "manuscript";
  /** Trim size in inches. */
  width: number;
  height: number;
  fontSize: number;
  /** Approximate words per page at this size, for gutter estimation. */
  wordsPerPage: number;
  fonts: FontId[];
}

export const PRESETS: Preset[] = [
  { id: "kdp-6x9", label: "KDP Paperback 6 × 9 in", description: "The most common trade paperback size for novels.", kind: "kdp", width: 6, height: 9, fontSize: 11, wordsPerPage: 300, fonts: ["garamond", "baskerville", "crimson"] },
  { id: "kdp-5.5x8.5", label: "KDP Paperback 5.5 × 8.5 in", description: "Digest size, popular for fiction and memoir.", kind: "kdp", width: 5.5, height: 8.5, fontSize: 11, wordsPerPage: 260, fonts: ["garamond", "baskerville", "crimson"] },
  { id: "kdp-5.25x8", label: "KDP Paperback 5.25 × 8 in", description: "Slightly smaller trade size for novels.", kind: "kdp", width: 5.25, height: 8, fontSize: 10.5, wordsPerPage: 240, fonts: ["garamond", "baskerville", "crimson"] },
  { id: "kdp-5x8", label: "KDP Paperback 5 × 8 in", description: "Compact size for novels and novellas.", kind: "kdp", width: 5, height: 8, fontSize: 10.5, wordsPerPage: 230, fonts: ["garamond", "baskerville", "crimson"] },
  { id: "manuscript", label: "Standard Manuscript Format", description: "For agents and editors: Letter, 1\" margins, 12pt, double spaced.", kind: "manuscript", width: 8.5, height: 11, fontSize: 12, wordsPerPage: 250, fonts: ["times", "courier"] },
];

export const FONT_LABELS: Record<FontId, string> = {
  garamond: "Garamond",
  baskerville: "Baskerville",
  crimson: "Crimson Text",
  courier: "Courier",
  times: "Times New Roman",
};

/** KDP minimum inside margin (inches) by page count, no bleed. */
export function kdpGutter(pages: number): number {
  if (pages <= 150) return 0.375;
  if (pages <= 300) return 0.5;
  if (pages <= 500) return 0.625;
  if (pages <= 700) return 0.75;
  return 0.875;
}

export interface PageMargins { top: number; bottom: number; inside: number; outside: number }

/**
 * Margins in inches. KDP outside minimum is 0.25"; we use comfortable reading
 * margins and make both sides at least the gutter (exports can't mirror pages,
 * so symmetric margins keep the inside margin compliant on every page).
 */
export function marginsFor(preset: Preset, wordCount: number): PageMargins {
  if (preset.kind === "manuscript") return { top: 1, bottom: 1, inside: 1, outside: 1 };
  const pages = Math.ceil(wordCount / preset.wordsPerPage) + 6;
  const side = Math.max(kdpGutter(pages), 0.625);
  return { top: 0.75, bottom: 0.75, inside: side, outside: side };
}

export function getPreset(id: string | null | undefined): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

/** "about 87,000 words": nearest 1,000 for long works, nearest 100 otherwise. */
export function approximateWordCount(words: number): string {
  const step = words >= 10_000 ? 1000 : 100;
  return `about ${(Math.max(step, Math.round(words / step) * step)).toLocaleString("en-US")} words`;
}

export interface ExportOptions {
  preset: Preset;
  font: FontId;
  author: string;
  /** Contact block for manuscript format (address, email, phone). */
  contact: string;
  /** Title page + copyright page (KDP) / cover page info (manuscript). */
  frontMatter: boolean;
  /** Print subchapter titles; otherwise scenes are separated by a scene break. */
  sceneTitles: boolean;
}

export interface ExportChapter {
  title: string;
  /** 1 = chapter (starts a new page), 2 = scene/subchapter. */
  level: 1 | 2;
  html: string;
}

export interface ExportBook {
  title: string;
  chapters: ExportChapter[];
  wordCount: number;
}
