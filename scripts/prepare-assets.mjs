import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

await mkdir("public/images", { recursive: true });
await mkdir("lib", { recursive: true });
const html = await fetch("https://pennyshop.ba/shop/penny-plus").then((r) => r.text());
const categories = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g)]
  .map((m) => ({
    href: new URL(m[1], "https://pennyshop.ba").href,
    name: m[2]
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/&scaron;/g, "š")
      .replace(/&Scaron;/g, "Š")
      .replace(/&amp;/g, "&"),
  }))
  .filter(
    (c) =>
      /^https:\/\/pennyshop\.ba\/shop\/penny-plus\/[^/?#]+$/.test(c.href) &&
      c.name &&
      !c.name.includes("(") &&
      !["novo", "kategorije"].includes(c.href.split("/").at(-1)),
  );
const unique = [...new Map(categories.map((c) => [c.href, c])).values()];
await writeFile("lib/shop-categories.json", JSON.stringify(unique, null, 2) + "\n");
console.log(`Verified ${unique.length} category links from PennyShop.`);
const assets = [
  [
    "hero",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=85",
  ],
  [
    "interior",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85",
  ],
  [
    "bathroom",
    "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "garden",
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "tools",
    "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "kitchen",
    "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "construction",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=85",
  ],
  ["store", "https://pennyshop.ba/assets/img/penny-locations/big/penny-plus-marketi8.jpg"],
  ["company", "https://pennyshop.ba/assets/img/penny-locations/big/penny-plus-marketi5.jpg"],
];
await Promise.all(
  assets.map(async ([name, url]) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await sharp(bytes).rotate().webp({ quality: 83 }).toFile(`public/images/${name}.webp`);
    console.log(`Downloaded ${name}`);
  }),
);
const logo = await fetch("https://www.pennyplus.com/images/logo.png");
if (!logo.ok) throw new Error(`logo: ${logo.status}`);
await writeFile("public/images/penny-wordmark.png", Buffer.from(await logo.arrayBuffer()));
console.log("Downloaded logo");
