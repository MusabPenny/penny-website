import Link from "next/link";
import { publishedEntries } from "@/lib/cms";
import { EntryCards } from "./managed-content";

export async function HomeOffers() {
  const results = await Promise.allSettled([
    publishedEntries("promotion", { limit: 2 }),
    publishedEntries("catalog", { limit: 2 }),
  ]);
  const promotions = results[0].status === "fulfilled" ? results[0].value : [];
  const catalogs = results[1].status === "fulfilled" ? results[1].value : [];
  const unavailable = results.some((result) => result.status === "rejected");
  return (
    <section className="section container home-offers" aria-labelledby="offers-title">
      <div className="section-heading">
        <div>
          <div className="eyebrow">AKTUELNO U PENNY-U</div>
          <h2 id="offers-title">Ponude koje vrijedi pogledati.</h2>
        </div>
        <nav className="home-offer-links" aria-label="Ponude i katalozi">
          <Link className="button button-red" href="/akcije">
            Sve akcije
          </Link>
          <Link className="button button-dark" href="/katalozi">
            Svi katalozi
          </Link>
        </nav>
      </div>
      {promotions.length > 0 && <EntryCards entries={promotions} basePath="/akcije" empty="" />}
      {catalogs.length > 0 && <EntryCards entries={catalogs} empty="" />}
      {!promotions.length && !catalogs.length && (
        <p className="data-note">
          {unavailable
            ? "Ponude trenutno ne možemo učitati. Pokušajte ponovo kasnije ili posjetite PennyShop."
            : "Trenutno nema objavljenih akcija i kataloga. Kompletnu ponudu pronađite na PennyShopu."}
        </p>
      )}
    </section>
  );
}

export async function HomeNews() {
  const result = await Promise.allSettled([publishedEntries("news", { limit: 3 })]);
  if (result[0].status === "rejected")
    return (
      <section className="section container">
        <p>Novosti trenutno nisu dostupne. Pokušajte ponovo kasnije.</p>
      </section>
    );
  const news = result[0].value;
  if (!news.length) return null;
  return (
    <section className="section container" aria-labelledby="home-news-title">
      <div className="section-heading">
        <div>
          <div className="eyebrow">PENNY NOVOSTI</div>
          <h2 id="home-news-title">Priče iz našeg svijeta.</h2>
        </div>
        <Link className="text-link" href="/novosti">
          Sve novosti →
        </Link>
      </div>
      <EntryCards entries={news} basePath="/novosti" empty="" />
    </section>
  );
}
