/**
 * A single view over the two Story Bible tables: characters, and world entries
 * (locations, themes, items, …, distinguished by `category`).
 */
export type ElementKind = "character" | "world";

export interface StoryElement {
  id: string;
  kind: ElementKind;
  name: string;
  /** "character" for characters, otherwise the world entry's category. */
  category: string;
  /** Character role or world entry one-liner. */
  subtitle: string;
  photos: string[];
  description: string;
  notes: string;
  history: string;
}

export type ElementPatch = Partial<
  Pick<StoryElement, "name" | "category" | "subtitle" | "photos" | "description" | "notes" | "history">
>;

export interface NewElementType {
  label: string;
  kind: ElementKind;
  category: string;
}

export const NEW_ELEMENT_TYPES: NewElementType[] = [
  { label: "Character", kind: "character", category: "character" },
  { label: "Location", kind: "world", category: "location" },
  { label: "Theme", kind: "world", category: "theme" },
  { label: "Item", kind: "world", category: "item" },
  { label: "Faction", kind: "world", category: "faction" },
  { label: "Lore", kind: "world", category: "lore" },
];

export interface CharacterRow {
  id: string;
  name: string | null;
  role: string | null;
  images: string[] | null;
  description: string | null;
  notes: string | null;
  backstory: string | null;
}

export interface WorldEntryRow {
  id: string;
  title: string | null;
  category: string | null;
  one_line: string | null;
  images: string[] | null;
  content: string | null;
  notes: string | null;
  history: string | null;
}

export function fromCharacter(row: CharacterRow): StoryElement {
  return {
    id: row.id,
    kind: "character",
    name: row.name ?? "",
    category: "character",
    subtitle: row.role ?? "",
    photos: row.images ?? [],
    description: row.description ?? "",
    notes: row.notes ?? "",
    history: row.backstory ?? "",
  };
}

export function fromWorldEntry(row: WorldEntryRow): StoryElement {
  return {
    id: row.id,
    kind: "world",
    name: row.title ?? "",
    category: (row.category || "lore").toLowerCase(),
    subtitle: row.one_line ?? "",
    photos: row.images ?? [],
    description: row.content ?? "",
    notes: row.notes ?? "",
    history: row.history ?? "",
  };
}

/** Column updates for a patch, using each table's own column names. */
export function toRow(kind: ElementKind, patch: ElementPatch): Record<string, unknown> {
  const columns: Record<keyof ElementPatch, string> =
    kind === "character"
      ? { name: "name", category: "", subtitle: "role", photos: "images", description: "description", notes: "notes", history: "backstory" }
      : { name: "title", category: "category", subtitle: "one_line", photos: "images", description: "content", notes: "notes", history: "history" };
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch) as [keyof ElementPatch, unknown][]) {
    if (columns[key]) row[columns[key]] = value;
  }
  return row;
}

export function groupLabel(category: string): string {
  if (category === "character") return "Characters";
  const word = category.charAt(0).toUpperCase() + category.slice(1);
  return word.endsWith("s") || word === "Lore" ? word : `${word}s`;
}

/** Elements grouped for display, characters first then alphabetical groups. */
export function groupElements(elements: StoryElement[]): [string, StoryElement[]][] {
  const groups = new Map<string, StoryElement[]>();
  for (const el of elements) {
    const label = groupLabel(el.category);
    groups.set(label, [...(groups.get(label) ?? []), el]);
  }
  return [...groups.entries()].sort(([a], [b]) =>
    a === "Characters" ? -1 : b === "Characters" ? 1 : a.localeCompare(b),
  );
}
