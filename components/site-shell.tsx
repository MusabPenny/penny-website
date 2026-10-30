import Image from "next/image";
import Link from "next/link";
import { Header } from "./interactive";
import { Icon } from "./icon";
import { shopUrl } from "@/lib/content";

export function SiteHeader() {
  return (
    <>
      <a href="#sadrzaj" className="skip-link">
        Preskoči na sadržaj
      </a>
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>Domaća kompanija. Uz vas od 1996.</span>
          <div>
            <a href="tel:080020261">
              <Icon name="phone" size={13} />
              080 020 261 <span className="utility-muted">Besplatni info telefon</span>
            </a>
            <span className="utility-divider" />
            <Link href="/poslovni-kupci">
              Za poslovne kupce <Icon name="diagonal" size={13} />
            </Link>
          </div>
        </div>
      </div>
      <Header />
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" aria-label="PennyPlus početna">
              <Image
                src="/penny.png"
                width={750}
                height={750}
                sizes="(max-width: 760px) 72px, 82px"
                alt="PennyPlus i Penny marketi"
                className="brand-image"
              />
            </Link>
            <p>Dobrodošli kući.</p>
            <span>Domaća kompanija. Velike mogućnosti.</span>
          </div>
          <div>
            <h3>Istražite</h3>
            <Link href="/akcije">Akcije i vikend ponude</Link>
            <Link href="/katalozi">Katalozi</Link>
            <Link href="/kategorije">Kategorije</Link>
            <Link href="/usluge">Naše usluge</Link>
            <Link href="/prodajni-centri">Prodajni centri</Link>
            <Link href="/o-nama">O kompaniji</Link>
            <Link href="/nas-tim">Naš tim</Link>
          </div>
          <div>
            <h3>Penny svijet</h3>
            <Link href="/partneri">Partneri i brendovi</Link>
            <Link href="/dokumenti">Dokumenti</Link>
            <a href={shopUrl} target="_blank" rel="noreferrer">
              PennyShop <Icon name="diagonal" size={12} />
            </a>
            <Link href="/poslovni-kupci">Poslovni kupci</Link>
            <a href="https://pennytoysandfun.com/" target="_blank" rel="noreferrer">
              Toys’n’Fun <Icon name="diagonal" size={12} />
            </a>
            <Link href="/novosti">Novosti</Link>
          </div>
          <div>
            <h3>Ostanimo povezani</h3>
            <Link href="/newsletter">Newsletter</Link>
            <Link href="/privatnost">Privatnost</Link>
            <a
              href="https://www.facebook.com/PennyPlusPennyMarketi/"
              target="_blank"
              rel="noreferrer"
            >
              Facebook
            </a>
            <a href="https://www.instagram.com/pennyplus/" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <Link href="/kontakt">Kontakt i podrška</Link>
            <a href="mailto:info@pennyplus.com">info@pennyplus.com</a>
            <a href="tel:080020261">080 020 261</a>
            <Link href="/karijera">
              Pridružite se našem timu <Icon name="arrow" size={12} />
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Penny plus d.o.o. Sarajevo</span>
          <span>Gradimo povjerenje od 1996.</span>
          <a href="#sadrzaj">
            Nazad na vrh <Icon name="arrow" className="arrow-up" size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
}
