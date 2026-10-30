import Link from "next/link";
import { PageIntro } from "@/components/seo";
import { EntryCards } from "@/components/managed-content";
import { publishedEntries } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";
export const revalidate = 60;
const description =
  "Pronađite otvorena radna mjesta u PennyPlusu, pošaljite prijavu za posao ili se prijavite za stručnu praksu kroz naš novi sistem.";
export const metadata = pageMetadata("Karijera i otvorena radna mjesta", description, "/karijera");
export default async function CareersPage() {
  const jobs = await publishedEntries("job");
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Rastemo zajedno s vama."
        description={description}
        eyebrow="KARIJERA U PENNYPLUSU"
        path="/karijera"
      />
      <div className="container page-section">
        <section className="prose">
          <h2>Zašto PennyPlus?</h2>
          <p>
            Raznovrsni poslovi u prodaji, logistici, uslugama i podršci povezuju različita znanja u
            zajednički tim. Naš rad počiva na saradnji, razmjeni iskustava i brizi o kupcima.
          </p>
          <p>
            Želimo pružiti prostor za profesionalni i lični razvoj, inicijativu i učenje od kolega.
            Uslove za pojedinačno radno mjesto pronađite u oglasu.
          </p>
        </section>
        <nav className="cms-tabs">
          <Link className="button button-red" href="/karijera/prijava">
            Otvorena prijava
          </Link>
          <Link className="button button-dark" href="/karijera/praksa">
            Prijava za praksu
          </Link>
        </nav>
        <h2>Otvorena radna mjesta</h2>
        <EntryCards
          entries={jobs}
          basePath="/karijera/oglasi"
          empty="Trenutno nema otvorenih oglasa. Možete nam poslati otvorenu prijavu."
        />
      </div>
    </main>
  );
}
