import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexable } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Let crawlers read the noindex meta tag on preview environments.
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(isIndexable ? { sitemap: absoluteUrl("/sitemap.xml") } : {}),
  };
}
