/**
 * Turning a timeline written in Word into Story Bible timeline events. Reads
 * a table (columns such as When / Chapters / What happens), or failing that
 * lines like "Day 1 – Sanai arrives", or a heading per point in time.
 */

export const TIMELINE_TYPES = ["event", "chapter", "flashback", "backstory", "turning_point", "black_moment", "resolution"] as const;
export type TimelineType = (typeof TIMELINE_TYPES)[number];

export interface ImportedEvent {
  timeLabel: string;
  title: string;
  description: string;
  chapterRef: string;
  location: string;
  characters: string[];
  type: TimelineType;
}

export const MAX_IMPORT_EVENTS = 500;

/** Field lengths the import route accepts (longer text is cut). */
export const EVENT_LIMITS = { timeLabel: 200, title: 300, description: 10_000, chapterRef: 200, location: 300, character: 100, characters: 50 };

/** A document as a flat list of blocks: tables, headings and lines of text. */
export type DocBlock =
  | { kind: "table"; rows: string[][]; headerRow: boolean }
  | { kind: "heading"; level: number; text: string }
  | { kind: "text"; text: string; listItem: boolean };

const clean = (s: string) => s.replace(/[ \t\u00a0]+/g, " ").replace(/ *\n */g, "\n").trim();

/** Blocks of a document's HTML (from readDocxHtml). Browser only. */
export function docBlocks(html: string): DocBlock[] {
  if (typeof DOMParser === "undefined") return [];
  const body = new DOMParser().parseFromString(html, "text/html").body;
  const blocks: DocBlock[] = [];
  // A cell or list item's text, its paragraphs on separate lines.
  const textOf = (el: Element) =>
    clean(
      Array.from(el.childNodes)
        .map((n) => (n.nodeType === Node.ELEMENT_NODE && /^(P|LI|DIV|H[1-6])$/.test((n as Element).tagName) ? `${n.textContent}\n` : n.textContent))
        .join(""),
    );
  // Each list item is a line; nested lists follow their parent item.
  const isList = (n: Node) => n.nodeType === Node.ELEMENT_NODE && /^(UL|OL)$/.test((n as Element).tagName);
  const list = (el: Element) => {
    for (const li of Array.from(el.children).filter((c) => c.tagName === "LI")) {
      const own = clean(Array.from(li.childNodes).filter((n) => !isList(n)).map((n) => n.textContent).join(" "));
      if (own) blocks.push({ kind: "text", text: own, listItem: true });
      Array.from(li.children).filter(isList).forEach(list);
    }
  };
  const walk = (parent: Element) => {
    for (const el of Array.from(parent.children)) {
      const tag = el.tagName;
      if (tag === "TABLE") {
        const rows = Array.from(el.querySelectorAll("tr")).filter((tr) => tr.closest("table") === el);
        blocks.push({
          kind: "table",
          headerRow: !!rows[0]?.querySelector("th") || rows[0]?.parentElement?.tagName === "THEAD",
          rows: rows.map((tr) => Array.from(tr.children).filter((c) => /^T[DH]$/.test(c.tagName)).map(textOf)),
        });
      } else if (/^H[1-6]$/.test(tag)) {
        const text = clean(el.textContent ?? "");
        if (text) blocks.push({ kind: "heading", level: Number(tag[1]), text });
      } else if (tag === "UL" || tag === "OL") {
        list(el);
      } else if (tag === "BLOCKQUOTE" || tag === "DIV") {
        walk(el);
      } else {
        const text = clean(el.textContent ?? "");
        if (text) blocks.push({ kind: "text", text, listItem: false });
      }
    }
  };
  walk(body);
  return blocks;
}

// ── Recognising columns ────────────────────────────────

type Role = "when" | "chapter" | "title" | "description" | "location" | "characters" | "type";

const ROLES: [Role, RegExp][] = [
  ["chapter", /^(chapters?|chs?|chapter s|chapter refs?|chapter reference|chapter numbers?|scenes?|chapter scene|chapters scenes)$/],
  ["when", /^(when|dates?|times?|timing|time ?frame|time ?period|period|days?|story (time|date|day)|in ?story (time|date)|time ?label|timeline|week|month|year|season|story clock)$/],
  ["title", /^(title|event title|event|events|name|beat|beats|headline|milestone|key event)$/],
  ["description", /^(what happens|what happened|happens|description|details|summary|notes|synopsis|plot|plot points?|what|action|outcome|story beats?)$/],
  ["location", /^(location|locations|place|places|setting|settings|where)$/],
  ["characters", /^(characters?|characters involved|who|people|cast|pov|pov characters?)$/],
  ["type", /^(type|kind|category|event type)$/],
];

const roleOf = (header: string): Role | null => {
  const h = header.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
  return ROLES.find(([, re]) => re.test(h))?.[0] ?? null;
};

const CHAPTER_NUMBERS = /^(ch(apters?|s)?\.?\s*)?\d{1,3}(\s*([-–—,&]|and|to)\s*\d{1,3})*\.?$/i;

/** Column roles for a table, from its header row or (failing that) its contents. */
function columnRoles(rows: string[][]): { roles: (Role | null)[]; header: boolean } | null {
  const first = rows[0] ?? [];
  const fromHeader = first.map((cell) => (cell.length <= 40 ? roleOf(cell) : null));
  const matched = fromHeader.filter(Boolean);
  const usable = fromHeader.some((r) => r === "when" || r === "title" || r === "description");
  if (usable && (matched.length >= 2 || first.length <= 2)) {
    // Keep the first column for each role.
    const seen = new Set<Role>();
    return { roles: fromHeader.map((r) => (r && !seen.has(r) ? (seen.add(r), r) : null)), header: true };
  }
  // No header: guess. The first column is when, a column of chapter numbers is
  // chapters, and the wordiest of the rest is what happens.
  const width = Math.max(...rows.map((r) => r.length));
  if (width < 2 || width > 5 || rows.length < 2) return null;
  const roles: (Role | null)[] = Array(width).fill(null);
  roles[0] = "when";
  const column = (i: number) => rows.map((r) => r[i] ?? "").filter(Boolean);
  for (let i = 1; i < width; i++) {
    const cells = column(i);
    if (cells.length && cells.filter((c) => CHAPTER_NUMBERS.test(c)).length >= cells.length * 0.7) roles[i] = "chapter";
  }
  const avg = (i: number) => column(i).reduce((n, c) => n + c.length, 0) / Math.max(1, column(i).length);
  const rest = [...Array(width).keys()].filter((i) => !roles[i]);
  if (!rest.length) return null;
  roles[rest.reduce((a, b) => (avg(b) > avg(a) ? b : a))] = "description";
  return { roles, header: false };
}

// ── Building events ────────────────────────────────────

/** "1" -> "Chapter 1", "2-3" -> "Chapters 2–3", "4, 6" -> "Chapters 4, 6"; anything else as written. */
export function formatChapterRef(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim().replace(/\.$/, "");
  if (!text || !CHAPTER_NUMBERS.test(text) || /^ch/i.test(text)) return text;
  if (/^\d+$/.test(text)) return `Chapter ${text}`;
  return `Chapters ${text.replace(/\s*[-–—]\s*|\s+to\s+/g, "–").replace(/\s*,\s*/g, ", ")}`;
}

/** "Mr." or "p.m." end abbreviations, not sentences. */
const ABBREVIATION = /(?:\b(?:[ap]\.m|mrs?|ms|dr|st|mt|jr|sr|vs|etc|e\.g|i\.e|no|vol|ch|approx)|\b[A-Z])\.$/i;

function firstSentence(text: string): string {
  const end = /[.!?]["”’)]*(?=\s+["“(]?[A-Z0-9])/g;
  let m: RegExpExecArray | null;
  while ((m = end.exec(text))) {
    const upTo = text.slice(0, m.index + 1);
    if (!ABBREVIATION.test(upTo)) return text.slice(0, m.index + m[0].length);
  }
  return text;
}

/**
 * A short title for an event: its first sentence, or when that's long, its
 * first clauses ("Airport decoy, rental car, the drive to Banner Elk").
 */
export function titleFrom(text: string, max = 80): string {
  let sentence = firstSentence(text.split("\n")[0].trim()).trim();
  // Drop the closing full stop, but not the one in "3 a.m.".
  if (!ABBREVIATION.test(sentence)) sentence = sentence.replace(/[.;:,]+(["”’)]*)$/, "$1");
  if (sentence.length <= max) return sentence;
  const head = sentence.slice(0, max);
  const clause = Math.max(head.lastIndexOf(", "), head.lastIndexOf("; "), head.lastIndexOf(" – "), head.lastIndexOf(" — "));
  if (clause >= 25) return head.slice(0, clause);
  const space = head.lastIndexOf(" ");
  return `${head.slice(0, space > 20 ? space : max)}…`;
}

const TYPE_WORDS: [TimelineType, RegExp][] = [
  ["flashback", /flash ?back/i],
  ["backstory", /back ?story|backstory|before the story|history/i],
  ["turning_point", /turning|midpoint|inciting|plot point|catalyst/i],
  ["black_moment", /black|dark night|all is lost|crisis/i],
  ["resolution", /resolution|ending|climax|denouement|epilogue/i],
  ["chapter", /^chapter$/i],
];
const typeFrom = (raw: string): TimelineType => TYPE_WORDS.find(([, re]) => re.test(raw))?.[0] ?? "event";

export interface StoryBibleNames {
  characters: { name: string; nickname?: string | null }[];
  /** Places in the Story Bible's World section. */
  locations: string[];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (text: string, name: string, flags = "") => new RegExp(`(^|[^\\p{L}])${escape(name)}(?![\\p{L}])`, `u${flags}`).test(text);

/** Story Bible characters named in the text (by full name, first name or nickname). */
export function charactersIn(text: string, names: StoryBibleNames): string[] {
  return names.characters
    .filter((c) => {
      const full = c.name.trim();
      if (!full) return false;
      const first = full.split(/\s+/)[0];
      const forms = [full, first.length >= 3 ? first : "", c.nickname?.trim() ?? ""].filter((f) => f.length >= 2);
      return forms.some((f) => mentions(text, f));
    })
    .map((c) => c.name.trim());
}

/** The first Story Bible place named in the text ("the cabin" matches "The Cabin"). */
export function locationIn(text: string, names: StoryBibleNames): string {
  let best = { at: Infinity, name: "" };
  for (const place of names.locations) {
    const bare = place.trim().replace(/^the\s+/i, "");
    if (bare.length < 4) continue;
    const m = new RegExp(`(^|[^\\p{L}])${escape(bare)}(?![\\p{L}])`, "iu").exec(text);
    if (m && m.index < best.at) best = { at: m.index, name: place.trim() };
  }
  return best.name;
}

function makeEvent(
  parts: { when?: string; title?: string; description?: string; chapter?: string; location?: string; characters?: string; type?: string },
  names: StoryBibleNames,
): ImportedEvent | null {
  const when = (parts.when ?? "").split("\n")[0].trim();
  let description = (parts.description ?? "").trim();
  let chapter = (parts.chapter ?? "").trim();
  // "(Ch. 4)" or "(Chapters 2–3)" in the text.
  if (!chapter) {
    const m = /\s*\((ch(?:apters?|s)?\.?\s*\d[^)]*)\)\s*/i.exec(description);
    if (m) {
      chapter = m[1];
      description = (description.slice(0, m.index) + " " + description.slice(m.index + m[0].length)).trim();
    }
  }
  const title = (parts.title ?? "").split("\n")[0].trim() || (description ? titleFrom(description) : "");
  if (!title && !description) return null;
  const all = [when, title, description].join("\n");
  return {
    timeLabel: when || formatChapterRef(chapter),
    title: title || when,
    // The full text, even when the title is all of it.
    description,
    chapterRef: formatChapterRef(chapter),
    location: (parts.location ?? "").trim() || locationIn(all, names),
    characters: parts.characters?.trim()
      ? parts.characters.split(/\s*(?:[,;/&\n]|\band\b)\s*/).map((c) => c.trim()).filter(Boolean)
      : charactersIn(all, names),
    type: typeFrom(parts.type ?? ""),
  };
}

function fromTables(blocks: DocBlock[], names: StoryBibleNames): ImportedEvent[] {
  const events: ImportedEvent[] = [];
  for (const block of blocks) {
    if (block.kind !== "table" || block.rows.length < 2) continue;
    const layout = columnRoles(block.rows);
    if (!layout) continue;
    const width = Math.max(...block.rows.map((r) => r.length));
    for (const row of layout.header || block.headerRow ? block.rows.slice(1) : block.rows) {
      const filled = row.filter((c) => c.trim());
      // A row with text in one cell only, across a wide table, divides sections ("ACT TWO").
      if (!filled.length || (width >= 3 && filled.length === 1 && !row[layout.roles.indexOf("description")]?.trim())) continue;
      const parts: Record<string, string> = {};
      layout.roles.forEach((role, i) => {
        if (role && row[i]) parts[role] = row[i];
      });
      const event = makeEvent(parts, names);
      if (event) events.push(event);
    }
  }
  return events;
}

/** Words that mark the start of a line as a point in time. */
const TIME_WORDS =
  /\b(day|days|night|nights|week|weeks|month|months|year|years|morning|evening|afternoon|dawn|dusk|midnight|noon|hour|hours|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|spring|summer|autumn|fall|winter|christmas|thanksgiving|halloween|easter|new year|before|after|earlier|later|prologue|epilogue|chapter|ch|act|part|present|past|today|tomorrow|yesterday|then|now|age|childhood|\d{1,4}(st|nd|rd|th|s)?)\b/i;

// "Day 1 – …", "Night 0: …" or "Week 2—…" (not "11:45" or "Oct 3–5").
const LINE = /^(.{2,60}?)(?::\s+|\s+[–—-]\s+|—)\s*(\S.{2,})$/;

function fromLines(blocks: DocBlock[], names: StoryBibleNames): ImportedEvent[] {
  const events: ImportedEvent[] = [];
  for (const block of blocks) {
    if (block.kind !== "text") continue;
    const m = LINE.exec(block.text.split("\n")[0]);
    if (!m || !TIME_WORDS.test(m[1])) continue;
    const rest = [m[2], ...block.text.split("\n").slice(1)].join("\n");
    const event = makeEvent({ when: m[1], description: rest }, names);
    if (event) events.push(event);
  }
  return events.length >= 2 ? events : [];
}

/** Headings like "Story timeline" name the document, not a point in it. */
const DOC_HEADING = /^(the |story |book |novel )?(timeline|chronology|calendar)\b/i;

function fromHeadings(blocks: DocBlock[], names: StoryBibleNames): ImportedEvent[] {
  // Headings with text under them; the events are those at the commonest level.
  const sections: { heading: string; level: number; texts: string[] }[] = [];
  blocks.forEach((block, i) => {
    if (block.kind !== "heading" || DOC_HEADING.test(block.text)) return;
    const texts: string[] = [];
    for (let j = i + 1; j < blocks.length; j++) {
      const next = blocks[j];
      if (next.kind !== "text") break;
      texts.push(next.text);
    }
    if (texts.length) sections.push({ heading: block.text, level: block.level, texts });
  });
  const counts = new Map<number, number>();
  sections.forEach((s) => counts.set(s.level, (counts.get(s.level) ?? 0) + 1));
  const level = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const events = sections
    .filter((s) => s.level === level)
    .map((s) =>
      makeEvent(
        TIME_WORDS.test(s.heading) ? { when: s.heading, description: s.texts.join("\n") } : { title: s.heading, description: s.texts.join("\n") },
        names,
      ),
    )
    .filter((e): e is ImportedEvent => e !== null);
  return events.length >= 2 ? events : [];
}

export interface TimelineParse {
  events: ImportedEvent[];
  /** How the timeline was laid out in the document. */
  source: "table" | "lines" | "headings" | null;
}

/** Events in a document's blocks; empty when no timeline was recognised. */
export function parseTimeline(blocks: DocBlock[], names: StoryBibleNames): TimelineParse {
  const cap = (events: ImportedEvent[]) => events.slice(0, MAX_IMPORT_EVENTS);
  const table = fromTables(blocks, names);
  if (table.length) return { events: cap(table), source: "table" };
  const lines = fromLines(blocks, names);
  if (lines.length) return { events: cap(lines), source: "lines" };
  const headings = fromHeadings(blocks, names);
  if (headings.length) return { events: cap(headings), source: "headings" };
  return { events: [], source: null };
}
