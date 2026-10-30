import Link from "next/link";
import { PageIntro } from "@/components/seo";
import { Icon } from "@/components/icon";
import { pageMetadata } from "@/lib/seo";

const description =
  "PennyPlus za poslovne kupce, majstore i projekte. Kontaktirajte prodajni tim za upit ili otvorite postojeći PennyPlus B2B portal.";
export const metadata = pageMetadata(
  "Poslovni kupci i B2B saradnja",
  description,
  "/poslovni-kupci",
);

export default function BusinessPage() {
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Pouzdan partner vašem poslu."
        description={description}
        eyebrow="ZA POSLOVNE KUPCE"
        path="/poslovni-kupci"
      />
      <div className="container page-section">
        <div className="detail-layout">
          <article className="prose">
            <h2>Razgovarajmo o vašem projektu.</h2>
            <p>
              Za nabavku materijala, opreme i usluga za svoj posao obratite se PennyPlus prodajnom
              timu. U upitu navedite oblast projekta, potrebne količine i lokaciju kako bismo vas
              usmjerili prema odgovarajućem kontaktu.
            </p>
            <h2>Šta uključiti u poslovni upit?</h2>
            <ul>
              <li>Naziv kompanije i kontakt osobe.</li>
              <li>Kategorije materijala ili opreme i okvirne količine.</li>
              <li>Lokaciju projekta i željeni termin nabavke.</li>
              <li>Potrebu za dostavom ili obradom materijala.</li>
            </ul>
            <p>
              Cijenu, dostupnost, rokove i uslove saradnje potvrdite direktno s prodajnim timom.
            </p>
            <Link className="text-link" href="/usluge/rezanje-i-kantiranje">
              Usluge Reznog centra <Icon name="arrow" size={18} />
            </Link>
          </article>
          <aside className="detail-contact">
            <div className="eyebrow">POVEŽIMO SE</div>
            <h2>Vaši planovi. Naša podrška.</h2>
            <p>Postojeći poslovni korisnici mogu otvoriti PennyPlus B2B portal.</p>
            <a
              href="https://b2b.pennyplus.com/"
              className="button button-dark"
              target="_blank"
              rel="noreferrer"
            >
              Otvorite B2B portal <Icon name="diagonal" size={18} />
            </a>
            <a href="mailto:prodaja@pennyplus.com?subject=Poslovni%20upit" className="text-link">
              Pošaljite poslovni upit <Icon name="arrow" size={17} />
            </a>
          </aside>
        </div>
      </div>
    </main>
  );
}
