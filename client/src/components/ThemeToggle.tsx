import { useEffect, useState } from "react";
import { prefs } from "../lib/prefs";
import { Icon } from "./Icon";

type Theme = "system" | "light" | "dark";
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "Theme follows your device", light: "Day pages", dark: "Night pages" };

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => prefs.get("theme", "system"));

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    prefs.set("theme", theme);
  }, [theme]);

  return (
    <button type="button" className="btn line icon small" onClick={() => setTheme(NEXT[theme])} aria-label={`${LABEL[theme]}. Change theme.`} title={LABEL[theme]}>
      <Icon name={theme === "light" ? "sun" : theme === "dark" ? "moon" : "auto"} />
    </button>
  );
}
