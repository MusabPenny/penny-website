"use client";
import Link from "next/link";
export default function PublicError({ reset }: { reset: () => void }) {
  return (
    <main id="sadrzaj" className="container page-section">
      <h1>Sadržaj trenutno nije dostupan.</h1>
      <p>
        Pokušajte ponovo ili kontaktirajte naš tim na <a href="tel:080020261">080 020 261</a>.
      </p>
      <div className="home-offer-links">
        <button type="button" className="button button-red" onClick={reset}>
          Pokušaj ponovo
        </button>
        <Link className="button button-dark" href="/">
          Početna stranica
        </Link>
      </div>
    </main>
  );
}
