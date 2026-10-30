import assert from "node:assert/strict";
import { test } from "node:test";
import { entryStatus, selectEntries } from "../lib/admin/entry-list";
import type { Entry } from "../lib/cms-types";
const now = Date.parse("2026-10-29T12:00:00Z");
function entry(id: string, patch: Partial<Entry> = {}): Entry {
  return {
    id,
    kind: "news",
    slug: id,
    title: id,
    summary: "",
    body: "",
    status: "PUBLISHED",
    starts_at: "2026-10-01T12:00:00Z",
    ends_at: null,
    asset_path: null,
    asset_name: null,
    asset_mime: null,
    source_url: null,
    location: "",
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
    ...patch,
  };
}
test("list distinguishes published, scheduled and expired entries while retaining explicit draft/archive state", () => {
  assert.equal(entryStatus(entry("live"), now), "PUBLISHED");
  assert.equal(
    entryStatus(entry("future", { starts_at: "2026-11-01T00:00:00Z" }), now),
    "SCHEDULED",
  );
  assert.equal(entryStatus(entry("expired", { ends_at: "2026-10-20T00:00:00Z" }), now), "EXPIRED");
  assert.equal(
    entryStatus(entry("draft", { status: "DRAFT", ends_at: "2026-10-20T00:00:00Z" }), now),
    "DRAFT",
  );
});
test("search matches Bosnian text, combines words and respects the selected publication state", () => {
  const rows = [
    entry("one", { title: "Rođendani u Velešićima", location: "Sarajevo" }),
    entry("two", { title: "Rođendani u Blažuju", status: "DRAFT" }),
  ];
  assert.deepEqual(
    selectEntries(rows, "rodjendani velesici", "", "newest", now).map((e) => e.id),
    [],
  );
  assert.deepEqual(
    selectEntries(rows, "roden sarajevo", "PUBLISHED", "newest", now).map((e) => e.id),
    ["one"],
  );
  assert.deepEqual(
    selectEntries(rows, "", "DRAFT", "newest", now).map((e) => e.id),
    ["two"],
  );
});
test("newest, oldest and recently edited orders are independent and do not mutate server data", () => {
  const rows = [
    entry("a", { starts_at: "2026-09-01T00:00:00Z", updated_at: "2026-10-28T00:00:00Z" }),
    entry("b", { starts_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-05T00:00:00Z" }),
  ];
  assert.deepEqual(
    selectEntries(rows, "", "", "newest", now).map((e) => e.id),
    ["b", "a"],
  );
  assert.deepEqual(
    selectEntries(rows, "", "", "oldest", now).map((e) => e.id),
    ["a", "b"],
  );
  assert.deepEqual(
    selectEntries(rows, "", "", "updated", now).map((e) => e.id),
    ["a", "b"],
  );
  assert.deepEqual(
    rows.map((e) => e.id),
    ["a", "b"],
  );
});
