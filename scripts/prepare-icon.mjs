import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

// All brand assets derive from the user-provided public/penny.png.
const sizes = [16, 32, 48, 64, 128, 256];
const frames = await Promise.all(
  sizes.map((size) =>
    sharp("public/penny.png").resize(size, size, { fit: "contain" }).ensureAlpha().png().toBuffer(),
  ),
);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
frames.forEach((frame, i) => {
  const entry = 6 + i * 16;
  header[entry] = sizes[i] === 256 ? 0 : sizes[i];
  header[entry + 1] = header[entry];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
const ico = Buffer.concat([header, ...frames]);
await writeFile("app/favicon.ico", ico);
await writeFile("public/penny.ico", ico);
await sharp("public/penny.png").resize(180, 180).png().toFile("public/apple-touch-icon.png");
await mkdir("public/og", { recursive: true });
const photo = await sharp("public/images/hero.webp").resize(570, 630, { fit: "cover" }).toBuffer();
const logo = await sharp("public/penny.png").resize(92, 92).toBuffer();
const text = Buffer.from(
  `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><g font-family="Arial, sans-serif" fill="#282a25"><text x="60" y="222" font-size="17" letter-spacing="3">PENNYPLUS</text><text x="55" y="320" font-size="69" font-weight="bold">Dobrodošli</text><text x="55" y="402" font-size="78" fill="#c92631">kući.</text><text x="60" y="480" font-size="23">Dom. Gradnja. Svakodnevni život.</text><text x="60" y="572" font-size="18">pennyplus.com</text></g></svg>`,
);
await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#f4f2eb" } })
  .composite([
    { input: photo, left: 630, top: 0 },
    { input: logo, left: 60, top: 55 },
    { input: text, left: 0, top: 0 },
  ])
  .jpeg({ quality: 88 })
  .toFile("public/og/pennyplus.jpg");
console.log(
  "Generated multi-size favicon.ico, penny.ico, Apple touch icon and Open Graph thumbnail from public/penny.png.",
);
