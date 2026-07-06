import { useState, useCallback } from "react";
import { getTheme, setTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    setThemeState(newTheme);
  }, []);

  return { theme, changeTheme };
}
