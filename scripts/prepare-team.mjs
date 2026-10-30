import { access, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { ensureTeamBucket, storeTeamPhoto } from "./team-storage.mjs";

const source = "https://www.pennyplus.com/nastim";
const refresh = process.argv.includes("--refresh");
const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );
if (!refresh && (await exists("lib/team-data.json"))) {
  const cached = JSON.parse(await readFile("lib/team-data.json", "utf8"));
  const members = cached.departments.flatMap((d) => d.members);
  if (members.every((m) => m.image.src.includes("/storage/v1/object/public/team-photos/"))) {
    console.log(
      `Cached team snapshot: ${members.length} people. No network requests. Use --refresh to update.`,
    );
    process.exit(0);
  }
}
const response = await fetch(source, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`Team source: HTTP ${response.status}`);
const html = await response.text();
const clean = (text) =>
  text
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|nbsp|quot|apos|lt|gt);|&#(?:x[0-9a-f]+|\d+);/gi, (entity) => {
      const named = {
        "&amp;": "&",
        "&nbsp;": " ",
        "&quot;": '"',
        "&apos;": "'",
        "&lt;": "<",
        "&gt;": ">",
      };
      return (
        named[entity] ??
        String.fromCodePoint(
          entity.startsWith("&#x") ? parseInt(entity.slice(3), 16) : parseInt(entity.slice(2), 10),
        )
      );
    })
    .replace(/\s+/g, " ")
    .trim();
const slug = (text) =>
  text
    .replace(/Đ/g, "Dj")
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const content = html.slice(
  html.indexOf('<div id="contentWrapper">'),
  html.indexOf("<!-- START Bootstrap-Cookie-Alert"),
);
const departments = [
  ...content.matchAll(
    /<h3 class="block-head">([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3 class="block-head">|$)/g,
  ),
].map((section) => {
  const name = clean(section[1]);
  const members = [...section[2].matchAll(/<div class="team-box">([\s\S]*?)<\/ul>/g)].map(
    (match) => {
      const headings = [...match[1].matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map((h) =>
        clean(h[1]),
      );
      const contacts = [...match[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)]
        .map((li) => clean(li[1]))
        .filter(Boolean);
      const imageUrl = /<img\b[^>]*src="([^"]+)"/.exec(match[1])?.[1];
      if (headings.length !== 3 || headings[0] !== headings[1] || !imageUrl || !contacts[0])
        throw new Error(`Unexpected source card in ${name}`);
      return {
        id: slug(headings[0]),
        name: headings[0],
        role: headings[2],
        phone: contacts[0],
        emails: contacts.slice(1).filter((email) => email.includes("@")),
        imageUrl: new URL(imageUrl, source).href,
      };
    },
  );
  if (!members.length) throw new Error(`Empty department: ${name}`);
  return { id: slug(name), name, members };
});
const members = departments.flatMap((d) => d.members);
if (
  departments.length < 10 ||
  members.length < 50 ||
  new Set(members.map((m) => m.id)).size !== members.length
)
  throw new Error("Source validation failed; previous snapshot preserved.");
await ensureTeamBucket();
const images = new Map();
const urls = [...new Set(members.map((m) => m.imageUrl))];
// Limit concurrent downloads; repeated source placeholders share one Storage object.
let cursor = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Team photo: HTTP ${response.status} (${url})`);
      const original = Buffer.from(await response.arrayBuffer());
      const { data, info } = await sharp(original)
        .rotate()
        .resize({ width: 720, height: 900, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
      const hash = createHash("sha256").update(data).digest("hex").slice(0, 16);
      const src = await storeTeamPhoto(`${hash}.webp`, data);
      const blur = await sharp(data).resize({ width: 12 }).webp({ quality: 35 }).toBuffer();
      images.set(url, {
        src,
        width: info.width,
        height: info.height,
        blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
      });
    }
  }),
);
const snapshot = {
  source,
  importedAt: new Date().toISOString(),
  departments: departments.map((d) => ({
    ...d,
    members: d.members.map(({ imageUrl, ...member }) => ({
      ...member,
      image: images.get(imageUrl),
    })),
  })),
};
await writeFile("lib/team-data.json", JSON.stringify(snapshot, null, 2) + "\n");
await writeFile(
  "scripts/team-assets.json",
  JSON.stringify(
    [...images].map(([source, image]) => ({ source, ...image })),
    null,
    2,
  ) + "\n",
);
console.log(
  `Saved ${members.length} people in ${departments.length} departments, ${images.size} source photos in Supabase Storage.`,
);
