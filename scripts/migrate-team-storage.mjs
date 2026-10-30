import { readFile, writeFile, unlink, readdir, rmdir } from "node:fs/promises";
import { ensureTeamBucket, storeTeamPhoto } from "./team-storage.mjs";

const snapshot = JSON.parse(await readFile("lib/team-data.json", "utf8"));
const assets = JSON.parse(await readFile("scripts/team-assets.json", "utf8"));
const members = snapshot.departments.flatMap((group) => group.members);
const sources = [...new Set([...assets.map((a) => a.src), ...members.map((m) => m.image.src)])];
await ensureTeamBucket();
const migrated = new Map();
let freed = 0;
for (const src of sources) {
  if (!src.startsWith("/images/team/")) continue;
  const filename = src.slice("/images/team/".length);
  if (!/^[a-f0-9]{16}\.webp$/.test(filename)) throw new Error("Invalid local photo path.");
  const bytes = await readFile(`public${src}`);
  migrated.set(src, await storeTeamPhoto(filename, bytes));
  freed += bytes.length;
}
for (const member of members) member.image.src = migrated.get(member.image.src) ?? member.image.src;
for (const asset of assets) asset.src = migrated.get(asset.src) ?? asset.src;
await writeFile("lib/team-data.json", JSON.stringify(snapshot, null, 2) + "\n");
await writeFile("scripts/team-assets.json", JSON.stringify(assets, null, 2) + "\n");
// All uploads and public byte comparisons must succeed before any local deletion.
for (const src of migrated.keys()) await unlink(`public${src}`);
if (migrated.size && !(await readdir("public/images/team")).length)
  await rmdir("public/images/team");
console.log(`Verified ${migrated.size} Storage photos; removed ${freed} local bytes.`);
