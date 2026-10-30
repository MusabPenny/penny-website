import { PageIntro } from "@/components/seo";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Privatnost i obrada podataka",
  "Informacije o obradi podataka kandidata za posao i praksu, privatnim prilozima, kontaktu za zahtjeve i korištenju kolačića.",
  "/privatnost",
);
export default function Privacy() {
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Vaši podaci i privatnost."
        description="Informacije o obradi podataka putem PennyPlus stranice."
        eyebrow="PRIVATNOST"
        path="/privatnost"
      />
      <div className="container page-section">
        <article className="prose">
          <h2>Prijave za posao i praksu</h2>
          <p>
            Penny plus d.o.o. Sarajevo obrađuje podatke koje dostavite radi razmatranja prijave,
            procjene iskustva i kontakta u vezi s poslom ili stručnom praksom. Kontakt za pitanja i
            zahtjeve je <a href="mailto:info@pennyplus.com">info@pennyplus.com</a>.
          </p>
          <p>
            Prijava sadrži identifikacijske i kontakt podatke, podatke o obrazovanju, iskustvu i
            vještinama te priloge koje sami odaberete. Kod prakse uključeni su podaci o školovanju i
            roditelju ili staratelju. Ne dostavljajte podatke koji nisu potrebni za prijavu.
          </p>
          <p>
            Prijave i prilozi nisu javni. Dostupni su ovlaštenim administratorima koji obrađuju
            prijave; marketing nema taj pristup. Tehničko čuvanje podataka pružaju Supabase i
            hosting aplikacije.
          </p>
          <p>
            Podaci služe obradi prijave. Nakon završetka postupka možete zatražiti informacije o
            čuvanju, ispravku ili brisanje putem navedenog kontakta, uz oznaku prijave. Ovlašteni
            administrator može trajno obrisati prijavu i priloge iz sistema.
          </p>
          <h2>Kolačići i postavke</h2>
          <p>
            Interna Microsoft prijava koristi kolačić sesije. Izbor svijetle ili tamne teme čuva se
            u lokalnoj pohrani preglednika. Ova verzija ne uključuje marketinške ni analitičke alate
            za praćenje.
          </p>
          <h2>Newsletter</h2>
          <p>
            Ako se prijavite na newsletter, vaša e-mail adresa koristi se za novosti i ponude.
            Prijava je odvojena od prijave za posao i možete je povući putem poveznice za odjavu
            koju dobijete nakon prijave ili zahtjevom na info@pennyplus.com.
          </p>
        </article>
      </div>
    </main>
  );
}
