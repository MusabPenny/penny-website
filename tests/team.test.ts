import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { filterTeam, teamDepartments, teamMemberCount, teamPhoneHref } from "../lib/team";

test("the complete imported directory uses Supabase Storage photographs", () => {
  assert.equal(teamMemberCount, 70);
  assert.equal(teamDepartments.length, 17);
  const members = teamDepartments.flatMap((group) => group.members);
  assert.equal(new Set(members.map((member) => member.id)).size, members.length);
  for (const member of members) {
    assert.match(
      member.image.src,
      /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/team-photos\/[a-f0-9]{16}\.webp$/,
    );
    assert.ok(member.image.width > 0 && member.image.height > 0);
  }
});

test("search handles Bosnian characters, multiple terms and departments", () => {
  assert.equal(filterTeam("almedin kadric", "")[0].members[0].name, "Almedin Kadrić");
  assert.equal(filterTeam("UPRAVA", "")[0].id, "uprava");
  assert.equal(filterTeam("almedin", teamDepartments[1].id).length, 0);
  assert.equal(filterTeam("nepostojeca-osoba-xyz", "").length, 0);
  assert.equal(filterTeam("", "").flatMap((group) => group.members).length, 70);
  assert.equal(teamPhoneHref("033/222-226"), "tel:+38733222226");
});

test("the built page exposes every person and role before JavaScript", async () => {
  const html = await readFile(".next/server/app/nas-tim.html", "utf8");
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  const schemas = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ].map((match) => JSON.parse(match[1]));
  const directory = schemas.find((schema) => schema["@type"] === "ItemList");
  assert.ok(directory, "Public directory has structured data");
  for (const { item } of directory.itemListElement) {
    const id = new URL(item.url).hash.slice(1);
    assert.ok(html.includes(`id="${id}"`), item.name);
    assert.ok(html.includes(escape(item.name)), item.name);
    assert.ok(html.includes(escape(item.jobTitle)), item.jobTitle);
  }
  assert.equal((html.match(/class="team-card"/g) || []).length, directory.numberOfItems);
});
