import type { MetadataRoute } from "next";
import { publicRoutes } from "@/lib/pages";
import { absoluteUrl, isIndexable } from "@/lib/seo";
import { publishedEntries } from "@/lib/cms";
import { publishedLocations } from "@/lib/directory";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexable) return [];
  const [entries, locations] = await Promise.all([publishedEntries(), publishedLocations()]);
  const routes = new Set([
    ...publicRoutes.filter((p) => !p.startsWith("/novosti/") && !p.startsWith("/prodajni-centri/")),
    ...locations.map((location) => `/prodajni-centri/${location.slug}`),
    ...entries
      .filter((e) => ["job", "news", "promotion"].includes(e.kind))
      .map(
        (e) =>
          `${e.kind === "job" ? "/karijera/oglasi" : e.kind === "news" ? "/novosti" : "/akcije"}/${e.slug}`,
      ),
    "/karijera/prijava",
  ]);
  return [...routes].map((path) => ({ url: absoluteUrl(path) }));
}
