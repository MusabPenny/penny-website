"use client";

export default function AdminError({ retry }: { retry: () => void }) {
  return (
    <main id="sadrzaj" className="admin-auth">
      <section className="admin-auth-card">
        <p className="admin-eyebrow">PENNYPLUS ADMINISTRACIJA</p>
        <h1>Portal trenutno nije dostupan</h1>
        <p>Nismo mogli učitati podatke. Pokušajte ponovo ili se obratite administratoru.</p>
        <button className="admin-button" onClick={retry}>
          Pokušaj ponovo
        </button>
      </section>
    </main>
  );
}
