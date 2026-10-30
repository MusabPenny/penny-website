import assert from "node:assert/strict";
import { test } from "node:test";
import { pickerDateTime, pickerInstant } from "../lib/admin/date-time";

test("Sarajevo picker round-trips winter and summer independently of host timezone", () => {
  for (const [local, utc] of [
    ["2026-01-20T10:30", "2026-01-20T09:30:00.000Z"],
    ["2026-07-20T10:30", "2026-07-20T08:30:00.000Z"],
  ]) {
    assert.equal(pickerInstant(local).toISOString(), utc);
    assert.equal(pickerDateTime(utc), local);
  }
});
test("picker rejects malformed dates, DST gaps and ambiguous repeated hours", () => {
  for (const value of [
    "2026-02-30T10:00",
    "2026-03-29T02:30",
    "2026-10-25T02:30",
    "",
    "2026-01-20T10:30Z",
  ])
    assert.throws(() => pickerInstant(value), /Provjerite/);
});
