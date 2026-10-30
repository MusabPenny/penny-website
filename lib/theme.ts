export type Theme = "light" | "dark";

export const themeStorageKey = "pennyplus-theme";
const themeChangeEvent = "pennyplus:theme-change";

// Runs in the document head before the page paints. Light is the explicit
// default; a dark OS preference alone never changes the site theme.
export const themeBootstrap = `(()=>{try{document.documentElement.dataset.theme=localStorage.getItem(${JSON.stringify(themeStorageKey)})==="dark"?"dark":"light"}catch{}})();`;

export function getThemeSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function getServerThemeSnapshot(): Theme {
  return "light";
}

export function applyTheme(theme: Theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch {
      // Theme switching also works when storage is blocked or unavailable.
    }
  }
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function subscribeTheme(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === themeStorageKey || event.key === null) {
      applyTheme(event.newValue === "dark" ? "dark" : "light", false);
    }
  };
  window.addEventListener(themeChangeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(themeChangeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
