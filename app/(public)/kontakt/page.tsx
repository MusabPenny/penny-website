import Link from "next/link";
import { PageIntro } from "@/components/seo";
import { Icon } from "@/components/icon";
import { pageMetadata } from "@/lib/seo";

const description =
  "Kontaktirajte PennyPlus: besplatni info telefon 080 020 261, opće informacije i prodaja. Pronađite direktni kontakt svog prodajnog centra.";
export const metadata = pageMetadata("Kontakt i podrška kupcima", description, "/kontakt");

export default function ContactPage() {
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Dobar razgovor. Dobar početak."
        description={description}
        eyebrow="KONTAKTIRAJTE PENNYPLUS"
        path="/kontakt"
      />
      <div className="container page-section">
        <div className="contact-grid">
          <section className="contact-card">
            <Icon name="phone" size={27} />
            <h2>Info telefon</h2>
            <p>Za informacije o ponudi, uslugama i prodajnim centrima.</p>
            <a href="tel:080020261" className="contact-card-value">
              080 020 261
            </a>
            <small>Besplatni info telefon</small>
          </section>
          <section className="contact-card">
            <Icon name="mail" size={27} />
            <h2>Opće informacije</h2>
            <p>Za pitanja o kompaniji i usmjeravanje prema odgovarajućem timu.</p>
            <a href="mailto:info@pennyplus.com" className="contact-card-value">
              info@pennyplus.com
            </a>
          </section>
          <section className="contact-card">
            <Icon name="bag" size={27} />
            <h2>Prodaja</h2>
            <p>Za upite o planiranoj kupovini, količinama i organizaciji dostave.</p>
            <a href="mailto:prodaja@pennyplus.com" className="contact-card-value">
              prodaja@pennyplus.com
            </a>
          </section>
        </div>
        <div className="detail-layout contact-page-details">
          <section className="prose">
            <h2>Pišite pravom timu.</h2>
            <p>
              Za pitanje vezano za određenu poslovnicu, njeno radno vrijeme ili uslugu, najbrže ćete
              do informacija doći putem direktnog kontakta centra.
            </p>
            <p>
              U upitu ukratko opišite šta vam je potrebno i navedite poslovnicu ako je relevantna.
              Za rezanje i kantiranje ploča pripremite dimenzije i količine.
            </p>
            <Link href="/prodajni-centri" className="button button-dark">
              Kontakti svih centara <Icon name="arrow" size={18} />
            </Link>
          </section>
          <section className="detail-contact">
            <div className="eyebrow">REZNI CENTAR VOGOŠĆA</div>
            <h2>Projekat po vašoj mjeri.</h2>
            <p>Za obradu pločastih materijala obratite se direktno našem Reznom centru.</p>
            <a href="mailto:reznicentar@pennyplus.com" className="text-link">
              reznicentar@pennyplus.com <Icon name="arrow" size={16} />
            </a>
            <Link href="/prodajni-centri/rezni-centar" className="text-link">
              Adresa i radno vrijeme <Icon name="arrow" size={16} />
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
