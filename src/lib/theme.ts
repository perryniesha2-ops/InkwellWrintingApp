export type Theme = "default" | "light" | "white" | "graphite" | "blue" | "purple";

/** Palettes live in globals.css under [data-theme="…"]; preview = [background, accent]. */
export const THEMES: {
  value: Theme;
  label: string;
  preview: [string, string];
}[] = [
  { value: "default", label: "Dark", preview: ["#1c1c1e", "#d4a843"] },
  { value: "graphite", label: "Dark Gray", preview: ["#2a2b2f", "#e0b450"] },
  { value: "blue", label: "Blue", preview: ["#0f1726", "#6eacff"] },
  { value: "purple", label: "Purple", preview: ["#1b1526", "#bb98f6"] },
  { value: "light", label: "Light", preview: ["#f5f5f5", "#b8922a"] },
  { value: "white", label: "White", preview: ["#ffffff", "#8f6c12"] },
];

const STORAGE_KEY = "prosr-theme";

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.some((t) => t.value === stored))
      return stored as Theme;
  } catch {
    /* ignore */
  }
  return "default";
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  if (theme === "default") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function initTheme() {
  setTheme(getTheme());
}
