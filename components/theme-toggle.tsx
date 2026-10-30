"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, getServerThemeSnapshot, getThemeSnapshot, subscribeTheme } from "@/lib/theme";
import { Icon } from "./icon";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  const isDark = theme === "dark";
  const label = isDark ? "Uključi svijetlu temu" : "Uključi tamnu temu";

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => applyTheme(isDark ? "light" : "dark")}
    >
      <Icon name={isDark ? "sun" : "moon"} size={20} />
    </button>
  );
}
