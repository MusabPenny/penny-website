import Link from "next/link";
import { absoluteUrl, organizationId } from "@/lib/seo";

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export type Crumb = { label: string; href: string };

export function PageIntro({
  title,
  description,
  eyebrow,
  path,
  crumbs = [],
}: {
  title: string;
  description: string;
  eyebrow: string;
  path: string;
  crumbs?: Crumb[];
}) {
  const items = [{ label: "Početna", href: "/" }, ...crumbs, { label: title, href: path }];
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            item: absoluteUrl(item.href),
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${absoluteUrl(path)}#webpage`,
          url: absoluteUrl(path),
          name: title,
          description,
          inLanguage: "bs-BA",
          isPartOf: { "@id": `${absoluteUrl()}#website` },
          about: { "@id": organizationId },
        }}
      />
      <div className="page-intro">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Putanja stranice">
            <ol>
              {items.map((item, i) => (
                <li key={item.href}>
                  {i < items.length - 1 ? (
                    <Link href={item.href}>{item.label}</Link>
                  ) : (
                    <span aria-current="page">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
    </>
  );
}
