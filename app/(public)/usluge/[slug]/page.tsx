import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro, JsonLd } from "@/components/seo";
import { RelatedCategories } from "@/components/content-sections";
import { Icon } from "@/components/icon";
import { servicePages } from "@/lib/pages";
import { absoluteUrl, organizationId, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return servicePages.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps<"/usluge/[slug]">) {
  const { slug } = await params;
  const service = servicePages.find((s) => s.slug === slug);
  if (!service) notFound();
  return pageMetadata(service.title, service.description, `/usluge/${slug}`);
}

export default async function ServicePage({ params }: PageProps<"/usluge/[slug]">) {
  const { slug } = await params;
  const service = servicePages.find((s) => s.slug === slug);
  if (!service) notFound();
  return (
    <main id="sadrzaj">
      <PageIntro
        title={service.title}
        description={service.description}
        eyebrow="PODRŠKA ZA VAŠ PROJEKAT"
        path={`/usluge/${slug}`}
        crumbs={[{ label: "Usluge", href: "/usluge" }]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          "@id": `${absoluteUrl(`/usluge/${slug}`)}#service`,
          name: service.title,
          description: service.description,
          url: absoluteUrl(`/usluge/${slug}`),
          provider: { "@id": organizationId },
        }}
      />
      <div className="container page-section">
        <div className="detail-layout">
          <article className="prose">
            <h2>{service.heading}</h2>
            {service.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <h2>Kako pripremiti svoj upit?</h2>
            <ol className="steps-list">
              {service.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <Link className="text-link" href="/usluge">
              Sve PennyPlus usluge <Icon name="arrow" size={18} />
            </Link>
          </article>
          <aside className="detail-aside">
            <div className="detail-photo">
              <Image
                src={`/images/${service.image}.webp`}
                alt=""
                fill
                sizes="(max-width: 760px) 100vw, 35vw"
              />
            </div>
            <div className="detail-contact">
              <span className="eyebrow">DOGOVORIMO DETALJE</span>
              <h2>{service.summary}</h2>
              <p>Provjerite mogućnosti i uslove za svoj projekat s našim timom.</p>
              <a href={service.href} className="button button-red">
                {service.action}
                <Icon name="arrow" size={17} />
              </a>
              <a href="tel:080020261" className="text-link">
                <Icon name="phone" size={16} />
                080 020 261
              </a>
            </div>
          </aside>
        </div>
        <RelatedCategories slugs={service.related} />
      </div>
    </main>
  );
}
