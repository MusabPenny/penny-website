import Link from "next/link";
import { Icon } from "./icon";
import { categories } from "@/lib/content";
import { servicePages } from "@/lib/pages";
import { publishedLocations } from "@/lib/directory";

export function ServiceCards() {
  return (
    <div className="information-grid">
      {servicePages.map((service, index) => (
        <Link className="information-card" href={`/usluge/${service.slug}`} key={service.slug}>
          <div className="information-card-top">
            <Icon name={service.icon} size={30} />
            <span>0{index + 1}</span>
          </div>
          <h2>{service.title}</h2>
          <p>{service.text}</p>
          <span className="text-link">
            Saznajte više <Icon name="arrow" size={18} />
          </span>
        </Link>
      ))}
    </div>
  );
}

export async function LocationDirectory() {
  const locationPages = await publishedLocations();
  return (
    <div className="location-directory">
      {["PennyPlus", "Penny marketi", "Rezni centar", "Toys&Fun igraonice"].map((type) => (
        <section key={type} className="directory-group">
          <div className="directory-group-heading">
            <h2>{type === "PennyPlus" ? "PennyPlus prodajni centri" : type}</h2>
            <span>
              {locationPages.filter((l) => l.type === type).length}{" "}
              {type === "Rezni centar" ? "lokacija" : "lokacije"}
            </span>
          </div>
          <div className="store-grid">
            {locationPages
              .filter((l) => l.type === type)
              .map((location) => (
                <article className="store-card" key={location.slug}>
                  <div className="store-card-heading">
                    <Icon name="pin" size={22} />
                    <h3>
                      <Link href={`/prodajni-centri/${location.slug}`}>{location.name}</Link>
                    </h3>
                  </div>
                  <p>
                    {location.address}
                    <br />
                    {location.city}
                  </p>
                  <div className="store-card-hours">
                    <Icon name="clock" size={15} />
                    {location.hours}
                  </div>
                  <a href={`tel:${location.phone}`} className="text-link">
                    {location.displayPhone}
                  </a>
                  <Link
                    className="text-link store-detail-link"
                    href={`/prodajni-centri/${location.slug}`}
                  >
                    Detalji centra <Icon name="arrow" size={17} />
                  </Link>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function RelatedCategories({ slugs }: { slugs: string[] }) {
  const selected = categories.filter((category) => slugs.includes(category.slug));
  return (
    <section className="related-section">
      <div className="eyebrow">NASTAVITE NA PENNYSHOPU</div>
      <h2>Ponuda za vaše planove.</h2>
      <div className="related-categories">
        {selected.map((category) => (
          <a href={category.href} key={category.slug} target="_blank" rel="noreferrer">
            <span>{category.name}</span>
            <Icon name="diagonal" size={20} />
          </a>
        ))}
      </div>
    </section>
  );
}

export function ContactCta() {
  return (
    <section className="inline-contact">
      <div>
        <h2>Tu smo za vaša pitanja.</h2>
        <p>Kontaktirajte naš tim i dogovorite sljedeći korak.</p>
      </div>
      <Link className="button button-dark" href="/kontakt">
        Kontaktirajte nas <Icon name="arrow" size={18} />
      </Link>
    </section>
  );
}
