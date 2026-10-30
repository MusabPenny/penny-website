import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { servicePages } from "@/lib/pages";
import Image from "next/image";
import { CategoryExplorer } from "@/components/interactive";
import { LiveLocationFinder } from "@/components/location-finder";
import { Icon } from "@/components/icon";
import { shopUrl } from "@/lib/content";
import { HomeOffers, HomeNews } from "@/components/home-offers";
import { ProjectGuide } from "@/components/project-guide";
import "./home.css";

export const revalidate = 60;

export const metadata = pageMetadata(
  "Dobrodošli kući - dom, gradnja i uređenje",
  "Istražite PennyPlus kategorije za dom i gradnju, upoznajte naše usluge i pronađite svoj centar u Sarajevu. Kupovinu nastavite na PennyShopu.",
  "/",
);

export default function Home() {
  return (
    <main id="sadrzaj" className="home-experience">
      <section className="signature-hero" aria-labelledby="hero-title">
        <Image
          src="/images/hero.jpg"
          alt="PennyPlus prodajni centar s prepoznatljivom crvenom fasadom, ulazom i parkingom"
          fill
          sizes="100vw"
          preload
          className="signature-photo"
        />
        <div className="signature-shade" aria-hidden="true" />
        <div className="signature-content container">
          <div className="signature-topline">
            <span>
              <i aria-hidden="true" /> DOMAĆA PRIČA. VELIKE MOGUĆNOSTI.
            </span>
            <span>SARAJEVO · OD 1996.</span>
          </div>
          <div className="signature-main">
            <div className="signature-copy">
              <h1 id="hero-title">
                Dobrodošli
                <br />
                <em>kući.</em>
                <span className="signature-period" aria-hidden="true">
                  +
                </span>
              </h1>
              <p>
                Za velike planove. Za male radosti.
                <br />
                Za sve ono što zovete svojim.
              </p>
              <div className="signature-actions">
                <a href="#kategorije" className="button signature-primary">
                  Pronađite svoju inspiraciju <Icon name="arrow" size={20} />
                </a>
                <a href={shopUrl} className="signature-shop" target="_blank" rel="noreferrer">
                  Kupujte na PennyShopu <Icon name="diagonal" size={18} />
                </a>
              </div>
            </div>
            <Link
              href="/o-nama"
              className="signature-anniversary"
              aria-label="30 godina zajedno — upoznajte PennyPlus"
            >
              <span>VAŠE IDEJE. NAŠA PODRŠKA.</span>
              <strong>30</strong>
              <span>GODINA ZAJEDNO</span>
              <Icon name="diagonal" size={22} />
            </Link>
          </div>
          <div className="signature-bottom">
            <span>Sve za dom, gradnju i svakodnevicu.</span>
            <a href="#kategorije">
              Otkrijte svoj Penny{" "}
              <span>
                <Icon name="arrow" size={18} />
              </span>
            </a>
            <Link href="/prodajni-centri">
              <Icon name="pin" size={16} /> Pronađite svoj centar
            </Link>
          </div>
        </div>
      </section>
      <nav className="home-shortcuts container" aria-label="Brzi pristup ponudi">
        <Link href="/akcije">
          <span className="shortcut-index">01</span>
          <span>
            <strong>Vrijedi pogledati</strong>
            <small>Aktuelne akcije</small>
          </span>
          <Icon name="arrow" size={18} />
        </Link>
        <Link href="/katalozi">
          <span className="shortcut-index">02</span>
          <span>
            <strong>Prelistajte inspiraciju</strong>
            <small>Katalozi i ponuda</small>
          </span>
          <Icon name="arrow" size={18} />
        </Link>
        <Link href="/prodajni-centri">
          <span className="shortcut-index">03</span>
          <span>
            <strong>Isplanirajte posjetu</strong>
            <small>Lokacije i radno vrijeme</small>
          </span>
          <Icon name="arrow" size={18} />
        </Link>
      </nav>
      <div className="benefit-strip container">
        <div>
          <Icon name="home" size={23} />
          <span>
            <strong>Sve za vaše planove</strong>
            <small>Od temelja do posljednjeg detalja</small>
          </span>
        </div>
        <div>
          <Icon name="pin" size={23} />
          <span>
            <strong>Uvijek smo blizu</strong>
            <small>Prodajni centri i marketi u Sarajevu</small>
          </span>
        </div>
        <div>
          <Icon name="truck" size={25} />
          <span>
            <strong>Podrška na svakom koraku</strong>
            <small>Stručni savjeti i korisne usluge</small>
          </span>
        </div>
        <a href={shopUrl} target="_blank" rel="noreferrer">
          <Icon name="cart" size={23} />
          <span>
            <strong>Kupujte na PennyShopu</strong>
            <small>Naša ponuda, na vašem ekranu</small>
          </span>
          <Icon name="diagonal" size={17} />
        </a>
      </div>
      <section id="kategorije" className="section container" aria-labelledby="category-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <span className="section-index">01 /</span> SVIJET MOGUĆNOSTI
            </div>
            <h2 id="category-title">
              Velike ideje.
              <br />
              <em>Počinju ovdje.</em>
            </h2>
          </div>
          <p>
            Pronađite svoj sljedeći projekat.
            <br />
            Odabrana kategorija vodi vas na PennyShop.
          </p>
        </div>
        <CategoryExplorer editorial />
        <Link href="/kategorije" className="section-page-link text-link">
          Otvorite pregled svih kategorija <Icon name="arrow" size={18} />
        </Link>
      </section>
      <ProjectGuide />
      <HomeOffers />
      <section className="shop-banner container" aria-labelledby="shop-title">
        <div className="shop-banner-art" aria-hidden="true">
          <span className="shop-cart">
            <Icon name="cart" size={40} />
          </span>
          <span className="art-circle one" />
          <span className="art-circle two" />
        </div>
        <div>
          <div className="eyebrow">VAŠA ONLINE PRODAVNICA</div>
          <h2 id="shop-title">
            Sve što volite.
            <br />
            <em>Na jedan klik.</em>
          </h2>
          <p>Istražite kompletnu ponudu i obavite kupovinu na jednom mjestu.</p>
        </div>
        <a className="button button-dark" href={shopUrl} target="_blank" rel="noreferrer">
          Posjetite PennyShop <Icon name="diagonal" size={18} />
        </a>
      </section>
      <section className="services-section section" id="usluge" aria-labelledby="services-title">
        <div className="container services-layout">
          <div className="services-intro">
            <div className="eyebrow">
              <span className="section-index">03 /</span> VIŠE OD KUPOVINE
            </div>
            <h2 id="services-title">
              Tu smo i za
              <br />
              <em>sljedeći korak.</em>
            </h2>
            <p>
              Od prave nijanse do preciznog reza. Naše usluge pretvaraju vaše planove u
              jednostavnije korake.
            </p>
            <a className="text-link" href="tel:080020261">
              Razgovarajte s nama <Icon name="arrow" size={19} />
            </a>
            <div className="service-signature">
              Vi zamislite.
              <br />
              <span>Mi pomažemo da ostvarite.</span>
            </div>
          </div>
          <div className="service-list">
            {servicePages.map((service, index) => (
              <details className="service-item" key={service.title}>
                <summary>
                  <span className="service-icon">
                    <Icon name={service.icon} size={26} />
                  </span>
                  <span className="service-label">
                    <small>0{index + 1}</small>
                    <strong>{service.title}</strong>
                    <span>{service.summary}</span>
                  </span>
                  <span className="service-toggle">
                    <Icon name="plus" size={21} />
                  </span>
                </summary>
                <div className="service-description">
                  <Link className="service-page-link text-link" href={`/usluge/${service.slug}`}>
                    Detaljnije o usluzi <Icon name="arrow" size={16} />
                  </Link>
                  <p>{service.text}</p>
                  <a href={service.href} className="text-link">
                    {service.action}
                    <Icon name="arrow" size={16} />
                  </a>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section
        id="o-nama"
        className="section container about-section"
        aria-labelledby="about-title"
      >
        <div className="about-image">
          <Image
            src="/images/company.webp"
            alt="PennyPlus prodajni centar i Penny market u Sarajevu"
            fill
            sizes="(max-width: 760px) 100vw, 48vw"
          />
          <div className="anniversary">
            <span>30</span>
            <div>
              GODINA
              <br />
              ZAJEDNO
            </div>
          </div>
        </div>
        <div className="about-copy">
          <div className="eyebrow">DOMAĆA PRIČA KOJA RASTE</div>
          <h2 id="about-title">
            Dio vašeg doma.
            <br />
            <em>Dio vaše priče.</em>
          </h2>
          <p>
            Od 1996. godine rastemo zajedno s vašim idejama. Od prvog alata i uređenja stana do
            izgradnje doma - PennyPlus je mjesto na kojem planovi dobijaju oblik.
          </p>
          <p>
            Našu priču čine ljudi: kolege koji znaju svoj posao i kupci koji nam se vraćaju. Zajedno
            stvaramo više, svaki dan.
          </p>
          <div className="about-stats">
            <div>
              <strong>1996.</strong>
              <span>Godina našeg početka</span>
            </div>
            <div>
              <strong>500+</strong>
              <span>Ljudi u našem timu</span>
            </div>
          </div>
          <Link className="text-link" href="/o-nama">
            Upoznajte PennyPlus <Icon name="diagonal" size={17} />
          </Link>
        </div>
      </section>
      <section id="centri" className="locations-section section" aria-labelledby="locations-title">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">KOMŠIJE NA KOJE RAČUNATE</div>
              <h2 id="locations-title">Vidimo se u Penny-u.</h2>
            </div>
            <p>
              Pronađite svoj centar, provjerite radno vrijeme
              <br />i svratite po sve za svoje planove.
            </p>
          </div>
          <LiveLocationFinder />
          <Link href="/prodajni-centri" className="section-page-link text-link">
            Sve lokacije i detalji centara <Icon name="arrow" size={18} />
          </Link>
        </div>
      </section>
      <HomeNews />
      <section className="contact-section container" id="kontakt">
        <div>
          <div className="eyebrow">IMATE IDEJU ILI PITANJE?</div>
          <h2>
            Svaki dobar plan počinje
            <br />
            dobrim razgovorom.
          </h2>
        </div>
        <div className="contact-actions">
          <a href="tel:080020261" className="contact-phone">
            080 020 261 <Icon name="diagonal" size={25} />
          </a>
          <span>Besplatni info telefon</span>
          <a className="text-link" href="mailto:info@pennyplus.com">
            info@pennyplus.com <Icon name="arrow" size={17} />
          </a>
        </div>
      </section>
    </main>
  );
}
