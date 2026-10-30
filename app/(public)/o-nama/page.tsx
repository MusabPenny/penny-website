import Image from "next/image";
import Link from "next/link";
import { PageIntro } from "@/components/seo";
import { ContactCta } from "@/components/content-sections";
import { Icon } from "@/components/icon";
import { pageMetadata } from "@/lib/seo";

const description =
  "Upoznajte PennyPlus, domaću kompaniju iz Sarajeva koja od 1996. povezuje trgovinu, usluge i podršku za dom, gradnju i svakodnevni život.";
export const metadata = pageMetadata("O nama - domaća kompanija od 1996.", description, "/o-nama");

export default function AboutPage() {
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Domaća priča. Zajednički rast."
        description={description}
        eyebrow="UPOZNAJTE PENNYPLUS"
        path="/o-nama"
      />
      <div className="container page-section">
        <div className="detail-layout">
          <article className="prose">
            <h2>Uz vaše domove i projekte od 1996.</h2>
            <p>
              Penny plus d.o.o. osnovan je 1996. godine sa sjedištem u Sarajevu. Poslujemo u
              trgovini na veliko i malo, proizvodnji i uslugama, uz ponudu za gradnju, uređenje i
              svakodnevne potrebe.
            </p>
            <p>
              Na području Kantona Sarajevo našu mrežu čine četiri PennyPlus prodajna centra i šest
              Penny marketa. Dio Penny svijeta su i Rezni centar za obradu pločastih materijala te
              Toys’n’Fun prodavnica i igraonice.
            </p>
            <h2>Ljudi su središte naše priče.</h2>
            <p>
              Naš tim broji više od 500 ljudi. Znanje zaposlenih, podrška kupcima i dugoročni odnosi
              s partnerima važni su dijelovi našeg razvoja.
            </p>
            <p>
              Želimo da u PennyPlusu pronađete odgovarajuće materijale i opremu, ali i informacije
              koje vam pomažu da lakše krenete u svoj projekat. Naše usluge uključuju dostavu,
              toniranje boja te rezanje i kantiranje.
            </p>
            <div className="prose-links">
              <Link href="/nas-tim" className="text-link">
                Upoznajte naš tim <Icon name="arrow" size={18} />
              </Link>
              <Link href="/usluge" className="text-link">
                Upoznajte naše usluge <Icon name="arrow" size={18} />
              </Link>
              <Link href="/karijera" className="text-link">
                Pridružite se timu <Icon name="arrow" size={18} />
              </Link>
            </div>
          </article>
          <div className="about-page-photo">
            <Image
              src="/images/company.webp"
              alt="PennyPlus i Penny market u Sarajevu"
              fill
              sizes="(max-width: 760px) 100vw, 40vw"
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
        </div>
        <div className="company-facts">
          <div>
            <strong>1996.</strong>
            <span>Godina osnivanja</span>
          </div>
          <div>
            <strong>4</strong>
            <span>PennyPlus prodajna centra</span>
          </div>
          <div>
            <strong>6</strong>
            <span>Penny marketa</span>
          </div>
          <div>
            <strong>500+</strong>
            <span>Ljudi u našem timu</span>
          </div>
        </div>
        <ContactCta />
      </div>
    </main>
  );
}
