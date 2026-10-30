import type { Entry } from "../cms-types";
import { normalizeSearch } from "../content";

export const entryStatusLabels = {
  PUBLISHED: "Objavljeno",
  DRAFT: "Nacrt",
  ARCHIVED: "Arhivirano",
  SCHEDULED: "Zakazano",
  EXPIRED: "Isteklo",
} as const;
export type EntryStatus = keyof typeof entryStatusLabels;
export function entryStatus(entry: Entry, now: number): EntryStatus {
  if (entry.status !== "PUBLISHED") return entry.status;
  if (new Date(entry.starts_at).getTime() > now) return "SCHEDULED";
  if (entry.ends_at && new Date(entry.ends_at).getTime() <= now) return "EXPIRED";
  return "PUBLISHED";
}
export function selectEntries(
  entries: Entry[],
  query: string,
  status: string,
  sort: string,
  now: number,
) {
  const words = normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);
  return entries
    .filter(
      (e) =>
        (!status || entryStatus(e, now) === status) &&
        words.every((word) =>
          normalizeSearch(`${e.title} ${e.location} ${e.asset_name ?? ""}`).includes(word),
        ),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "bs")
        : sort === "oldest"
          ? Date.parse(a.starts_at) - Date.parse(b.starts_at)
          : sort === "updated"
            ? Date.parse(b.updated_at) - Date.parse(a.updated_at)
            : Date.parse(b.starts_at) - Date.parse(a.starts_at),
    );
}
