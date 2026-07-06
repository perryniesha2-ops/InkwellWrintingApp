export type Theme = "default" | "light";

export const THEMES: {
  value: Theme;
  label: string;
  preview: [string, string];
}[] = [
  { value: "default", label: "Dark", preview: ["#1c1c1e", "#d4a843"] },
  { value: "light", label: "Light", preview: ["#f5f5f5", "#b8922a"] },
];

const STORAGE_KEY = "inkwell-theme";

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
