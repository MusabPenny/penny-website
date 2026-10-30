import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro, JsonLd } from "@/components/seo";
import { Icon } from "@/components/icon";
import { publishedLocations } from "@/lib/directory";
import type { LocationRecord } from "@/lib/directory-types";
import { absoluteUrl, organizationId, pageMetadata } from "@/lib/seo";

export const dynamicParams = true;
export const revalidate = 60;
export async function generateStaticParams() {
  return (await publishedLocations()).map((location) => ({ slug: location.slug }));
}

const descriptionFor = (location: LocationRecord) =>
  `${location.title}: ${location.address}, ${location.city}. Pogledajte radno vrijeme, kontakt i upute za dolazak u ovaj Penny objekat.`;

export async function generateMetadata({ params }: PageProps<"/prodajni-centri/[slug]">) {
  const { slug } = await params;
  const locationPages = await publishedLocations();
  const location = locationPages.find((l) => l.slug === slug);
  if (!location) notFound();
  return pageMetadata(
    `${location.title} - adresa i radno vrijeme`,
    descriptionFor(location),
    `/prodajni-centri/${slug}`,
  );
}

export default async function LocationPage({ params }: PageProps<"/prodajni-centri/[slug]">) {
  const { slug } = await params;
  const locationPages = await publishedLocations();
  const location = locationPages.find((l) => l.slug === slug);
  if (!location) notFound();
  const isCutting = location.type === "Rezni centar";
  const isMarket = location.type === "Penny marketi";
  const isPlayroom = location.type === "Toys&Fun igraonice";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.title} ${location.address} ${location.city}`)}`;
  return (
    <main id="sadrzaj">
      <PageIntro
        title={location.title}
        description={descriptionFor(location)}
        eyebrow={location.type.toLocaleUpperCase("bs")}
        path={`/prodajni-centri/${slug}`}
        crumbs={[{ label: "Prodajni centri", href: "/prodajni-centri" }]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": isMarket
            ? "GroceryStore"
            : isCutting || isPlayroom
              ? "LocalBusiness"
              : "HardwareStore",
          "@id": `${absoluteUrl(`/prodajni-centri/${slug}`)}#location`,
          name: location.title,
          url: absoluteUrl(`/prodajni-centri/${slug}`),
          parentOrganization: { "@id": organizationId },
          telephone: location.phone,
          email: location.email,
          hasMap: mapsUrl,
          address: {
            "@type": "PostalAddress",
            streetAddress: location.address,
            addressLocality: location.city,
            addressCountry: "BA",
          },
        }}
      />
      <div className="container page-section">
        <div className="detail-layout">
          <article className="prose">
            <h2>
              {isCutting
                ? "Obrada ploča za vaš projekat u Vogošći."
                : isPlayroom
                  ? `Igra i rođendani u Toys&Fun ${location.name}.`
                  : isMarket
                    ? `Vaš Penny market u naselju ${location.name}.`
                    : `Sve za vaše planove u centru ${location.name}.`}
            </h2>
            <p>
              {isCutting
                ? "Rezni centar je mjesto za dogovor o rezanju i kantiranju pločastih materijala. Pripremite dimenzije dijelova, odabrani materijal i zahtjeve za obradu te kontaktirajte tim prije dolaska."
                : isPlayroom
                  ? `Toys&Fun ${location.name} je igraonica na adresi ${location.address}, ${location.city}. Kontaktirajte nas za informacije o igri, terminima i organizaciji rođendanskih proslava.`
                  : isMarket
                    ? `Posjetite Penny market na adresi ${location.address}, ${location.city}, za kupovinu prehrambenih proizvoda i robe široke potrošnje.`
                    : `PennyPlus ${location.name} je jedan od naših prodajnih centara za građevinski materijal i uređenje doma. Posjetite nas na adresi ${location.address} i razgovarajte s našim timom o svom projektu.`}
            </p>
            <h2>Šta možete pronaći ovdje?</h2>
            <ul>
              {location.services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
            <p>
              Za informacije o konkretnoj ponudi i uslugama kontaktirajte ovaj objekat. Artikle,
              cijene i online kupovinu možete istražiti na PennyShopu.
            </p>
            <Link
              href={
                isPlayroom
                  ? "https://pennytoysandfun.com/"
                  : isCutting
                    ? "/usluge/rezanje-i-kantiranje"
                    : "/kategorije"
              }
              className="text-link"
            >
              {isPlayroom
                ? "Posjetite Toys&Fun"
                : isCutting
                  ? "Detaljnije o rezanju i kantiranju"
                  : "Istražite kategorije ponude"}
              <Icon name="arrow" size={18} />
            </Link>
            <div className="editorial-note">
              <h2>Prije nego što krenete.</h2>
              <p>
                Objavljeno radno vrijeme predstavlja redovni raspored. Za rad tokom praznika,
                mogućnost dostave ili posebne usluge provjerite detalje direktno s centrom.
              </p>
            </div>
          </article>
          <aside className="detail-contact location-contact-panel">
            <div className="eyebrow">PLANIRAJTE SVOJU POSJETU</div>
            <h2>Adresa i kontakt</h2>
            <address>
              {location.address}
              <br />
              {location.city}
            </address>
            <div className="contact-panel-row">
              <Icon name="clock" size={19} />
              <span>{location.hours}</span>
            </div>
            <a className="contact-panel-row" href={`tel:${location.phone}`}>
              <Icon name="phone" size={19} />
              {location.displayPhone}
            </a>
            <a className="contact-panel-row" href={`mailto:${location.email}`}>
              <Icon name="mail" size={19} />
              {location.email}
            </a>
            <a className="button button-red" href={mapsUrl} target="_blank" rel="noreferrer">
              Pokaži put na karti <Icon name="diagonal" size={18} />
            </a>
          </aside>
        </div>
        <section className="related-section">
          <h2>Druge Penny lokacije.</h2>
          <div className="related-categories">
            {locationPages
              .filter((l) => l.slug !== slug && l.type === location.type)
              .map((l) => (
                <Link key={l.slug} href={`/prodajni-centri/${l.slug}`}>
                  {l.title}
                  <Icon name="arrow" size={18} />
                </Link>
              ))}
            <Link href="/prodajni-centri">
              Sve lokacije <Icon name="arrow" size={18} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
