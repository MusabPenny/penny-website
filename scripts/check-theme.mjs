import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";

const code = ts.transpileModule(await readFile("lib/theme.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function browser(saved, storageBlocked = false) {
  const stored = new Map(saved === undefined ? [] : [["pennyplus-theme", saved]]);
  const document = { documentElement: { dataset: { theme: "light" } } };
  const localStorage = {
    getItem(key) {
      if (storageBlocked) throw new Error("Storage blocked");
      return stored.get(key) ?? null;
    },
    setItem(key, value) {
      if (storageBlocked) throw new Error("Storage blocked");
      stored.set(key, value);
    },
  };
  const window = Object.assign(new EventTarget(), { localStorage });
  const exports = {};
  const context = { exports, document, window, localStorage, Event };
  runInNewContext(code, context);
  return { ...context, stored, theme: exports };
}

for (const [saved, expected] of [
  [undefined, "light"],
  ["light", "light"],
  ["dark", "dark"],
  ["invalid", "light"],
]) {
  const page = browser(saved);
  runInNewContext(page.theme.themeBootstrap, page);
  assert.equal(page.document.documentElement.dataset.theme, expected, `Initial theme for ${saved}`);
  assert.equal(page.theme.getServerThemeSnapshot(), "light", "Server default stays light");
}

const page = browser();
let changes = 0;
const unsubscribe = page.theme.subscribeTheme(() => {
  changes++;
});
page.theme.applyTheme("dark");
assert.equal(page.theme.getThemeSnapshot(), "dark");
assert.equal(page.stored.get("pennyplus-theme"), "dark");
assert.equal(changes, 1);
page.theme.applyTheme("light");
assert.equal(page.theme.getThemeSnapshot(), "light");
assert.equal(page.stored.get("pennyplus-theme"), "light");
assert.equal(changes, 2);

function storageEvent(key, newValue) {
  const event = new Event("storage");
  Object.assign(event, { key, newValue });
  page.window.dispatchEvent(event);
}
storageEvent("unrelated-key", "dark");
assert.equal(changes, 2, "Unrelated storage changes are ignored");
storageEvent("pennyplus-theme", "dark");
assert.equal(page.theme.getThemeSnapshot(), "dark");
assert.equal(page.stored.get("pennyplus-theme"), "light", "Cross-tab event does not write back");
storageEvent(null, null);
assert.equal(page.theme.getThemeSnapshot(), "light", "Clearing saved choices restores light");
const changeCount = changes;
unsubscribe();
page.theme.applyTheme("dark");
storageEvent("pennyplus-theme", "light");
assert.equal(changes, changeCount, "Unsubscribe removes both listeners");
assert.equal(page.theme.getThemeSnapshot(), "dark");

const blocked = browser("dark", true);
runInNewContext(blocked.theme.themeBootstrap, blocked);
assert.equal(blocked.theme.getThemeSnapshot(), "light");
blocked.theme.applyTheme("dark");
assert.equal(blocked.theme.getThemeSnapshot(), "dark", "Switching works with blocked storage");

const nativeRequire = createRequire(import.meta.url);
const toggleCode = ts.transpileModule(await readFile("components/theme-toggle.tsx", "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
for (const [current, target, icon, label] of [
  ["light", "dark", "moon", "Uključi tamnu temu"],
  ["dark", "light", "sun", "Uključi svijetlu temu"],
]) {
  const exports = {};
  let selected;
  runInNewContext(toggleCode, {
    exports,
    require: (name) => {
      if (name === "react") return { useSyncExternalStore: () => current };
      if (name === "@/lib/theme")
        return {
          applyTheme: (value) => {
            selected = value;
          },
        };
      if (name === "./icon") return { Icon: () => null };
      return nativeRequire(name);
    },
  });
  const button = exports.ThemeToggle();
  assert.equal(button.props["aria-label"], label);
  assert.equal(button.props.title, label);
  assert.ok(!Array.isArray(button.props.children), `${current}: exactly one theme icon`);
  assert.equal(button.props.children.props.name, icon, `${current}: correct theme icon`);
  button.props.onClick();
  assert.equal(selected, target, `${current}: switches to the other theme`);
}

// Validate contrast for the main text, accent and button pairs in dark mode.
const css = await readFile("app/globals.css", "utf8");
const declarations = css.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/)?.[1];
assert.ok(declarations, "Explicit dark palette");
const dark = Object.fromEntries(
  [...declarations.matchAll(/(--[\w-]+):\s*(#[\da-f]+);/gi)].map((m) => [m[1], m[2]]),
);
const lightDeclarations = css.match(/:root\s*\{([^}]+)\}/)?.[1];
const light = Object.fromEntries(
  [...lightDeclarations.matchAll(/(--[\w-]+):\s*(#[\da-f]+);/gi)].map((m) => [m[1], m[2]]),
);
const palette = { ...light, ...dark };
function luminance(hex) {
  const value =
    hex.length === 4
      ? hex
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      : hex.slice(1);
  const rgb = [0, 2, 4]
    .map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
for (const [fg, bg] of [
  ["--foreground", "--background"],
  ["--muted", "--cream"],
  ["--body-copy", "--background"],
  ["--red", "--cream"],
  ["--green", "--cream"],
  ["--button-dark-foreground", "--button-dark-background"],
  ["--utility-foreground", "--utility-background"],
  ["--utility-muted", "--utility-background"],
]) {
  const a = luminance(palette[fg]);
  const b = luminance(palette[bg]);
  assert.ok(
    (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
    `Dark contrast: ${fg} on ${bg}`,
  );
}
console.log(
  "PASS: light default, saved choice, theme switching, cross-tab sync, blocked storage, cleanup and core dark contrast pairs.",
);
