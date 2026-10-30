import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

function loadTs(path, environment = process.env) {
  const exports = {};
  const nativeRequire = createRequire(path);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const require = (specifier) =>
    specifier.startsWith(".") && !specifier.endsWith(".json")
      ? loadTs(resolve(dirname(path), `${specifier}.ts`), environment)
      : nativeRequire(specifier);
  runInNewContext(code, { exports, require, process: { env: environment }, URL });
  return exports;
}

const { categories, normalizeSearch, locations } = loadTs(resolve("lib/content.ts"));
const {
  publicRoutes: configuredRoutes,
  locationPages,
  servicePages,
} = loadTs(resolve("lib/pages.ts"));
const prerender = JSON.parse(await readFile(".next/prerender-manifest.json", "utf8"));
const publicRoutes = [
  ...new Set([
    ...configuredRoutes.filter((path) => !path.startsWith("/prodajni-centri/")),
    ...Object.keys(prerender.routes).filter(
      (p) => !p.startsWith("/_") && !p.startsWith("/api/") && !/\.[a-z]+$/.test(p),
    ),
  ]),
];
const appPaths = JSON.parse(await readFile(".next/server/app-paths-manifest.json", "utf8"));
assert.ok(appPaths["/admin/(protected)/page"], "Admin navigation destination exists");
const allowedRoutes = [...publicRoutes, "/karijera/prijava", "/newsletter/odjava", "/admin"];
const { absoluteUrl, isIndexable } = loadTs(resolve("lib/seo.ts"));
assert.equal(categories.length, 35);
assert.equal(new Set(categories.map((c) => c.href)).size, 35);
assert.equal(new Set(publicRoutes).size, publicRoutes.length);
assert.equal(locationPages.length, 13);
assert.equal(new Set(locationPages.map((l) => l.slug)).size, 13);
assert.equal(servicePages.length, 9);
for (const category of categories) {
  assert.match(category.href, /^https:\/\/pennyshop\.ba\/shop\/penny-plus\/[^/?#]+$/);
  assert.ok(!category.name.includes("&scaron;"));
}
for (const query of ["namjestaj", "masine", "djecu", "plocice"])
  assert.ok(categories.some((c) => normalizeSearch(c.name).includes(query)));
assert.equal(normalizeSearch("Đ, Š, Č, Ć, Ž"), "d, s, c, c, z");
assert.equal(locations.filter((l) => l.type === "PennyPlus").length, 4);
assert.equal(locations.filter((l) => l.type === "Penny marketi").length, 6);

const titles = new Set();
const descriptions = new Set();
const pages = new Map();
const stripScripts = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
const metadataUrl = (route) =>
  route === "/" ? absoluteUrl(route).replace(/\/$/, "") : absoluteUrl(route);
for (const route of publicRoutes) {
  const html = await readFile(
    `.next/server/app/${route === "/" ? "index" : route.slice(1)}.html`,
    "utf8",
  );
  pages.set(route, html);
  const rendered = stripScripts(html);
  assert.match(rendered, /<html[^>]+lang="bs"/, route);
  assert.match(rendered, /<html[^>]+data-theme="light"/, `${route}: default light theme`);
  assert.match(rendered, /aria-label="Uključi tamnu temu"/, `${route}: theme toggle`);
  assert.ok(
    html.indexOf('id="theme-init"') < html.indexOf("</head>"),
    `${route}: pre-paint theme initialization`,
  );
  assert.equal((rendered.match(/<h1\b/g) ?? []).length, 1, `${route}: one H1 in server HTML`);
  assert.equal((rendered.match(/<main\b/g) ?? []).length, 1, `${route}: one main landmark`);
  assert.ok(
    rendered.includes(`rel="canonical" href="${metadataUrl(route)}"`),
    `${route}: canonical`,
  );
  const title = rendered.match(/<title>([^<]+)<\/title>/)?.[1];
  assert.ok(title?.includes("PennyPlus"), `${route}: title`);
  assert.ok(!titles.has(title), `${route}: duplicate title`);
  titles.add(title);
  const description = rendered.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert.ok(description && description.length > 40, `${route}: description`);
  assert.ok(!descriptions.has(description), `${route}: duplicate description`);
  descriptions.add(description);
  assert.ok(
    rendered.includes(`property="og:url" content="${metadataUrl(route)}"`),
    `${route}: Open Graph URL`,
  );
  assert.match(rendered, /name="twitter:card" content="summary_large_image"/, route);
  assert.ok(rendered.includes(encodeURIComponent("/penny.png")), `${route}: supplied logo`);
  assert.ok(
    !/Create Next App|Dodaj u korpu/.test(rendered),
    `${route}: no starter or local products`,
  );
  const ids = new Set([...rendered.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  for (const match of rendered.matchAll(/href="#([^"]+)"/g))
    assert.ok(ids.has(match[1]), `${route}: missing anchor ${match[1]}`);
  for (const match of rendered.matchAll(/<a\b[^>]*href="(\/[^"#?]*)/g)) {
    const path = match[1];
    assert.ok(allowedRoutes.includes(path), `${route}: unresolved local link ${path}`);
  }
  const schemas = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ].map((m) => JSON.parse(m[1]));
  assert.ok(
    schemas.some((s) => s["@type"] === "Organization"),
    `${route}: organization schema`,
  );
  if (route !== "/")
    assert.ok(
      schemas.some((s) => s["@type"] === "BreadcrumbList"),
      `${route}: breadcrumbs`,
    );
  assert.ok(
    !schemas.some((s) => s["@type"] === "Product" || s.aggregateRating),
    `${route}: no fabricated product/rating schema`,
  );
}

const categoryDirectory = stripScripts(pages.get("/kategorije"))
  .split('class="category-directory"')[1]
  ?.split('class="category-bottom"')[0];
assert.ok(categoryDirectory);
for (const category of categories)
  assert.ok(
    categoryDirectory.includes(`href="${category.href}"`),
    `Category crawlability: ${category.name}`,
  );
for (const location of locationPages)
  assert.ok(
    stripScripts(pages.get("/prodajni-centri")).includes(
      `href="/prodajni-centri/${location.slug}"`,
    ),
  );

const sitemap = await readFile(".next/server/app/sitemap.xml.body", "utf8");
assert.equal((sitemap.match(/<loc>/g) ?? []).length, isIndexable ? publicRoutes.length + 1 : 0);
if (isIndexable)
  for (const route of publicRoutes) assert.ok(sitemap.includes(`<loc>${absoluteUrl(route)}</loc>`));
assert.ok(!sitemap.includes("pennyshop.ba"), "Sitemap only contains local pages");
const robots = await readFile(".next/server/app/robots.txt.body", "utf8");
assert.match(robots, /Allow: \//);
if (isIndexable) assert.ok(robots.includes(absoluteUrl("/sitemap.xml")));
assert.equal(
  loadTs(resolve("lib/seo.ts"), { ...process.env, SITE_INDEXABLE: "false" }).isIndexable,
  false,
);
assert.equal(
  loadTs(resolve("lib/seo.ts"), { ...process.env, VERCEL_ENV: "preview" }).isIndexable,
  false,
);

const ico = await readFile("app/favicon.ico");
assert.equal(ico.readUInt16LE(2), 1);
assert.equal(ico.readUInt16LE(4), 6, "Multi-resolution ICO");
assert.deepEqual(ico, await readFile("public/penny.ico"));
for (const asset of ["public/penny.png", "public/apple-touch-icon.png", "public/og/pennyplus.jpg"])
  await access(asset);
console.log(
  `PASS: ${publicRoutes.length} rendered pages, unique metadata, canonicals, crawlable links, JSON-LD, sitemap, preview noindex, logo and favicon.`,
);

if (process.argv.includes("--http")) {
  const origin = process.env.CHECK_BASE_URL || "http://127.0.0.1:32123";
  for (const route of publicRoutes) {
    const response = await fetch(`${origin}${route}`, { redirect: "manual" });
    assert.equal(response.status, 200, route);
    assert.equal(
      (stripScripts(await response.text()).match(/<h1\b/g) ?? []).length,
      1,
      `${route}: server response`,
    );
  }
  for (const route of [
    "/does-not-exist",
    "/usluge/does-not-exist",
    "/prodajni-centri/does-not-exist",
    "/novosti/does-not-exist",
  ]) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 404, route);
    assert.match(await response.text(), /noindex/, `${route}: noindex`);
  }
  const redirect = await fetch(`${origin}/onama`, { redirect: "manual" });
  assert.equal(redirect.status, 308);
  assert.ok(redirect.headers.get("location")?.endsWith("/o-nama"));
  const favicon = await fetch(`${origin}/favicon.ico`);
  assert.equal(favicon.status, 200);
  const image = await fetch(`${origin}/_next/image?url=%2Fpenny.png&w=128&q=75`);
  assert.equal(image.status, 200);
  assert.ok(image.headers.get("content-type")?.startsWith("image/"));
  console.log(
    "PASS: all production URLs, real 404s, permanent redirect, favicon and optimized logo.",
  );
}
