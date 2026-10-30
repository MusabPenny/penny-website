import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { JsonLd } from "@/components/seo";
import { siteUrl, isIndexable, organizationSchema, websiteSchema } from "@/lib/seo";
import { themeBootstrap } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "PennyPlus - Dobrodošli kući", template: "%s | PennyPlus" },
  description:
    "Sve za dom, gradnju i svakodnevni život. Istražite kategorije na PennyShopu, upoznajte naše usluge i pronađite svoj PennyPlus prodajni centar.",
  applicationName: "PennyPlus",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "16x16 32x32 48x48 64x64 128x128 256x256",
        type: "image/x-icon",
      },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: { index: isIndexable, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bs" className={geistSans.variable} data-theme="light" suppressHydrationWarning>
      <head>
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        {children}
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
      </body>
    </html>
  );
}
