import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const origin = process.env.CHECK_BASE_URL || "http://localhost:32124";
const aliases = JSON.parse(await readFile("lib/legacy-redirects.json", "utf8"));
for (const alias of aliases) {
  const response = await fetch(new URL(alias.source, origin), { redirect: "manual" });
  if (alias.source.toLowerCase() === alias.destination.toLowerCase() && response.status === 200) {
    const html = await response.text();
    assert.ok(html.includes(alias.destination), `${alias.source}: canonical or streamed redirect`);
    continue;
  }
  assert.equal(response.status, 308, alias.source);
  assert.equal(
    new URL(response.headers.get("location"), origin).href,
    new URL(alias.destination, origin).href,
    alias.source,
  );
}
console.log(
  `PASS: ${aliases.length} imported document, news and job links resolve to their new locations.`,
);
