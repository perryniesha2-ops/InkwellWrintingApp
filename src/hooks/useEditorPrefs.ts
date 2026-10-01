import { useState } from "react";
import type { CSSProperties } from "react";

export type FontFamily = "cormorant" | "playfair" | "jost" | "courier";
export type FontSize = "sm" | "md" | "lg" | "xl";

export interface EditorPrefs {
  fontFamily: FontFamily;
  fontSize: FontSize;
  /** Story element autocomplete + links while typing. */
  smartText: boolean;
}

export const FONT_OPTIONS = [
  {
    value: "cormorant" as FontFamily,
    label: "Cormorant",
    style: "'Cormorant Garamond', Georgia, serif",
  },
  {
    value: "playfair" as FontFamily,
    label: "Playfair",
    style: "'Playfair Display', Georgia, serif",
  },
  {
    value: "jost" as FontFamily,
    label: "Jost",
    style: "'Jost', system-ui, sans-serif",
  },
  {
    value: "courier" as FontFamily,
    label: "Courier",
    style: "'Courier Prime', Courier, monospace",
  },
];

export const SIZE_OPTIONS = [
  { value: "sm" as FontSize, label: "Small", size: "1rem", lineHeight: "1.8" },
  {
    value: "md" as FontSize,
    label: "Medium",
    size: "1.125rem",
    lineHeight: "1.9",
  },
  {
    value: "lg" as FontSize,
    label: "Large",
    size: "1.375rem",
    lineHeight: "2",
  },
  {
    value: "xl" as FontSize,
    label: "X-Large",
    size: "1.625rem",
    lineHeight: "2.1",
  },
];

const STORAGE_KEY = "prosr-editor-prefs";

const DEFAULT_PREFS: EditorPrefs = { fontFamily: "cormorant", fontSize: "md", smartText: true };

function loadPrefs(): EditorPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...(JSON.parse(stored) as Partial<EditorPrefs>) };
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFS;
}

export function useEditorPrefs() {
  const [prefs, setPrefs] = useState<EditorPrefs>(loadPrefs);

  const updatePrefs = (updates: Partial<EditorPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const fontOption =
    FONT_OPTIONS.find((f) => f.value === prefs.fontFamily) ?? FONT_OPTIONS[0];
  const sizeOption =
    SIZE_OPTIONS.find((s) => s.value === prefs.fontSize) ?? SIZE_OPTIONS[1];

  const editorStyle: CSSProperties = {
    fontFamily: fontOption.style,
    fontSize: sizeOption.size,
    lineHeight: sizeOption.lineHeight,
  };

  return { prefs, updatePrefs, fontOption, sizeOption, editorStyle };
}
