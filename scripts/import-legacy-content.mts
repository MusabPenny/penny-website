import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
nextEnv.loadEnvConfig(process.cwd());
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const origin = "https://www.pennyplus.com";
const redirects: { source: string; destination: string; permanent: true }[] = [];
const manifest: { kind: string; slug: string; source: string; asset?: string }[] = [];
const decode = (s: string) =>
  s.replace(
    /&(?:amp|quot|apos|nbsp|scaron|Scaron|ndash|mdash|bdquo|ldquo|rdquo|rsquo|lsquo);|&#(?:\d+|x[0-9a-f]+);/gi,
    (e) =>
      ({
        "&amp;": "&",
        "&quot;": '"',
        "&apos;": "'",
        "&nbsp;": " ",
        "&scaron;": "š",
        "&Scaron;": "Š",
        "&ndash;": "–",
        "&mdash;": "—",
        "&bdquo;": "„",
        "&ldquo;": "“",
        "&rdquo;": "”",
        "&rsquo;": "’",
        "&lsquo;": "‘",
      })[e] ??
      String.fromCodePoint(
        e.startsWith("&#x") ? parseInt(e.slice(3), 16) : parseInt(e.slice(2), 10),
      ),
  );
const clean = (s: string) =>
  decode(s.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
const slugify = (s: string) =>
  s
    .replace(/[đĐ]/g, "dj")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 145);
async function page(path: string) {
  const r = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Source HTTP ${r.status}: ${path}`);
  const h = await r.text();
  return h.slice(
    h.indexOf('<div id="contentWrapper">'),
    h.indexOf("<!-- START Bootstrap-Cookie-Alert"),
  );
}
async function bucket(name: string, isPublic: boolean) {
  const current = await client.storage.getBucket(name);
  if (current.data) {
    if (current.data.public !== isPublic) throw new Error("Bucket privacy mismatch");
    return;
  }
  const { error } = await client.storage.createBucket(name, {
    public: isPublic,
    fileSizeLimit: isPublic ? 10485760 : 3145728,
    allowedMimeTypes: isPublic
      ? ["application/pdf", "image/webp", "image/png", "image/jpeg"]
      : [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
  });
  if (error) throw new Error(`Bucket ${name} failed`);
}
await bucket("site-assets", true);
await bucket("candidate-files", false);
async function asset(url: string, folder: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Asset HTTP ${r.status}`);
  let bytes = Buffer.from(await r.arrayBuffer());
  let ext = "pdf",
    mime = "application/pdf";
  if (bytes.subarray(0, 5).toString() !== "%PDF-") {
    bytes = await sharp(bytes)
      .rotate()
      .resize({ width: 1600, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
    ext = "webp";
    mime = "image/webp";
  }
  const path = `${folder}/${createHash("sha256").update(bytes).digest("hex")}.${ext}`;
  const { error } = await client.storage
    .from("site-assets")
    .upload(path, bytes, { contentType: mime, cacheControl: "31536000", upsert: false });
  if (error && String(error.statusCode) !== "409") throw new Error("Storage upload failed");
  const publicUrl = client.storage.from("site-assets").getPublicUrl(path).data.publicUrl;
  const check = await fetch(publicUrl);
  if (!check.ok || !Buffer.from(await check.arrayBuffer()).equals(bytes))
    throw new Error("Storage verification failed");
  return {
    asset_path: path,
    asset_name: decodeURIComponent(new URL(url).pathname.split("/").at(-1)!),
    asset_mime: mime,
  };
}
async function insert(entry: Record<string, unknown>) {
  const prior = await client
    .from("site_entries")
    .select("id")
    .eq("kind", entry.kind)
    .eq("slug", entry.slug)
    .maybeSingle();
  if (prior.error) throw new Error("Import lookup failed");
  if (!prior.data) {
    const { error } = await client.from("site_entries").insert(entry);
    if (error) throw new Error(`Import ${entry.kind}/${entry.slug} failed: ${error.code}`);
  }
  manifest.push({
    kind: String(entry.kind),
    slug: String(entry.slug),
    source: String(entry.source_url),
    asset: entry.asset_path ? String(entry.asset_path) : undefined,
  });
}
const docs = await page("/dokument");
for (const m of docs.matchAll(/<a href="([^"]+)" class="project-name">([\s\S]*?)<\/a>/g)) {
  const source = decode(m[1]),
    title = clean(m[2]),
    slug = slugify(title);
  const file = await asset(source, "document");
  await insert({
    kind: "document",
    slug,
    title,
    summary:
      "Javni dokument kompanije Penny plus d.o.o. Sarajevo. Datum i period važenja navedeni su u dokumentu.",
    status: "PUBLISHED",
    source_url: source,
    ...file,
  });
  redirects.push({
    source: decodeURIComponent(new URL(source).pathname),
    destination: client.storage.from("site-assets").getPublicUrl(file.asset_path).data.publicUrl,
    permanent: true,
  });
}
for (let n = 1; n <= 3; n++) {
  const html = await page(`/partneri?page=${n}`);
  for (const m of html.matchAll(
    /<a href="(https:\/\/pennyshop.ba\/shop\/brand\/[^\"]+)">([\s\S]*?)<img src="([^"]+)"/g,
  )) {
    const source = decode(m[1]),
      slug = source.split("/").at(-1)!;
    await insert({
      kind: "partner",
      slug,
      title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      summary: "Istražite ponudu ovog brenda na PennyShopu.",
      source_url: source,
      status: "PUBLISHED",
      ...(await asset(decode(m[3]), "partner")),
    });
  }
}
const listing = await page("/novosti");
for (const block of listing.split(/<div\s+class="post-item fx"/).slice(1)) {
  const link = /<h2><a[^>]*href="([^"]+)">([\s\S]*?)<\/a>/.exec(block);
  if (!link) continue;
  const source = decode(link[1]),
    title = clean(link[2]);
  let slug = slugify(title);
  if (title.startsWith("Nova sezona")) slug = "nova-sezona-jednaka-podrska";
  if (title.startsWith("SIMPL")) slug = "qr-placanje-simpl";
  const html = await page(source);
  const article = /<article class="post-content">([\s\S]*?)<\/article>/.exec(html)?.[1] ?? "";
  const paragraphs = [...article.matchAll(/<(?:p|li)\b[^>]*>([\s\S]*?)<\/(?:p|li)>/g)]
    .map((m) => clean(m[1]))
    .filter(Boolean);
  const date = /(\d{2})\.(\d{2})\.(\d{4})\./.exec(block);
  const starts_at = date ? `${date[3]}-${date[2]}-${date[1]}T10:00:00Z` : new Date().toISOString();
  const photo = /<img src="([^"]+)"/.exec(block)?.[1];
  await insert({
    kind: "news",
    slug,
    title,
    summary: clean(/<p>([\s\S]*?)<a class="read-more"/.exec(block)?.[1] ?? title).slice(0, 1000),
    body: paragraphs.join("\n\n"),
    status: "PUBLISHED",
    starts_at,
    source_url: source,
    ...(photo ? await asset(decode(photo), "news") : {}),
  });
  redirects.push({
    source: decodeURIComponent(new URL(source).pathname),
    destination: `/novosti/${slug}`,
    permanent: true,
  });
}
const jobs = await page("/radnamjesta");
for (const block of jobs.split('<div class="post-item fx"').slice(1)) {
  const title = clean(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(block)?.[1] ?? "");
  const link = /class="read-more" href="([^"]+)"/.exec(block)?.[1];
  const photo = /<img src="([^"]+)"/.exec(block)?.[1];
  if (!title || !link) continue;
  const source = decode(link),
    slug = slugify(title);
  let body =
    "Detalji radnog mjesta i uslovi prikazani su na priloženom oglasu. Prijavu pošaljite putem obrasca na ovoj stranici.";
  try {
    const html = await page(source);
    const content = /<article class="post-content">([\s\S]*?)<\/article>/.exec(html)?.[1];
    if (content) {
      const p = [...content.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]
        .map((m) => clean(m[1]))
        .filter(Boolean);
      if (p.length) body = p.join("\n\n");
    }
  } catch {
    console.log(`Detail unavailable; preserving full poster: ${slug}`);
  }
  await insert({
    kind: "job",
    slug,
    title,
    summary: `Pridružite se PennyPlus timu: ${title.toLocaleLowerCase("bs")}.`,
    body,
    status: "DRAFT",
    source_url: source,
    ...(photo ? await asset(decode(photo), "job") : {}),
  });
  redirects.push({
    source: decodeURIComponent(new URL(source).pathname),
    destination: `/karijera/oglasi/${slug}`,
    permanent: true,
  });
}
await writeFile("lib/legacy-redirects.json", JSON.stringify(redirects, null, 2) + "\n");
await writeFile("scripts/content-import-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `Imported and verified ${manifest.length} records; originals stored in Supabase, no local binaries.`,
);
