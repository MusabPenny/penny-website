import type { Metadata } from "next";

const configuredUrl = new URL(process.env.SITE_URL || "https://www.pennyplus.com");
if (!["https:", "http:"].includes(configuredUrl.protocol))
  throw new Error("SITE_URL must be an HTTP(S) URL.");
export const siteUrl = configuredUrl.origin;
export const absoluteUrl = (path = "/") => new URL(path, `${siteUrl}/`).href;
export const isIndexable =
  process.env.SITE_INDEXABLE !== "false" &&
  process.env.VERCEL_ENV !== "preview" &&
  process.env.NODE_ENV !== "development";
export const organizationId = `${siteUrl}/#organization`;

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title: { absolute: `${title} | PennyPlus` },
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type: "website",
      locale: "bs_BA",
      siteName: "PennyPlus",
      title: `${title} | PennyPlus`,
      description,
      url: absoluteUrl(path),
      images: [
        {
          url: absoluteUrl("/og/pennyplus.jpg"),
          width: 1200,
          height: 630,
          alt: "PennyPlus - Dobrodošli kući",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | PennyPlus`,
      description,
      images: [absoluteUrl("/og/pennyplus.jpg")],
    },
    robots: {
      index: isIndexable,
      follow: true,
      googleBot: { index: isIndexable, follow: true, "max-image-preview": "large" },
    },
  };
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": organizationId,
  name: "PennyPlus",
  legalName: "Penny plus d.o.o. Sarajevo",
  url: absoluteUrl(),
  logo: { "@type": "ImageObject", url: absoluteUrl("/penny.png"), width: 750, height: 750 },
  foundingDate: "1996",
  email: "info@pennyplus.com",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "080020261",
    contactType: "customer service",
    areaServed: "BA",
    availableLanguage: "bs",
  },
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  name: "PennyPlus",
  url: absoluteUrl(),
  inLanguage: "bs-BA",
  publisher: { "@id": organizationId },
};
