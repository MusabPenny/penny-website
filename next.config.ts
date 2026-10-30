import type { NextConfig } from "next";
import legacyRedirects from "./lib/legacy-redirects.json";
import { locationPages } from "./lib/pages";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  images: {
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [
          new URL("/storage/v1/object/public/team-photos/**", process.env.NEXT_PUBLIC_SUPABASE_URL),
          new URL("/storage/v1/object/public/site-assets/**", process.env.NEXT_PUBLIC_SUPABASE_URL),
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      ...legacyRedirects
        .filter((r) => r.source.toLowerCase() !== r.destination.toLowerCase())
        .map((r) => ({
          ...r,
          source: encodeURI(r.source).replace(/[:()*+?]/g, "\\$&"),
          permanent: true,
        })),
      ...locationPages
        .filter((l) => l.type === "PennyPlus" || l.type === "Penny marketi")
        .flatMap((l) =>
          [l.name, l.name.toLocaleLowerCase("bs")].map((name) => ({
            source: `/prodajnicentri/${l.type === "PennyPlus" ? "pennyplus" : "pennymarketi"}/${name}`,
            destination: `/prodajni-centri/${l.slug}`,
            permanent: true,
          })),
        ),
      { source: "/radnamjesta", destination: "/karijera", permanent: true },
      { source: "/prijavazaposao", destination: "/karijera/prijava", permanent: true },
      { source: "/prijavazapraksu", destination: "/karijera/praksa", permanent: true },
      { source: "/zastomi", destination: "/karijera", permanent: true },
      { source: "/dokument", destination: "/dokumenti", permanent: true },
      { source: "/katalozipm", destination: "/katalozi", permanent: true },
      { source: "/vakcije", destination: "/akcije", permanent: true },
      { source: "/mjenjacnica", destination: "/usluge/mjenjacnica", permanent: true },
      { source: "/cat", destination: "/admin", permanent: true },
      { source: "/login", destination: "/admin/login", permanent: true },
      { source: "/onama", destination: "/o-nama", permanent: true },
      { source: "/nastim", destination: "/nas-tim", permanent: true },
      { source: "/prodajnicentri", destination: "/prodajni-centri", permanent: true },
      {
        source: "/proizvodi/svezavrt",
        destination: "https://pennyshop.ba/shop/penny-plus/vrtni-program",
        permanent: true,
      },
    ];
  },
  // Location/service routes are finite. CMS routes use ISR and accept new slugs
  // after publication; Cache Components remains disabled for static-route 404s.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
