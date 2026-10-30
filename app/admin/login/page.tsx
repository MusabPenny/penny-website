import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { missingAdminEnvironment } from "@/lib/admin/config";
import { getCurrentAppUser } from "@/lib/admin/access";
import { microsoftLogin } from "../actions";

export const metadata = { title: "Poslovna prijava" };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const missing = missingAdminEnvironment();
  if (!missing.length && !params.error && !params.reason) {
    const user = await getCurrentAppUser();
    if (user?.status === "APPROVED") redirect("/admin");
    if (user?.status === "PENDING") redirect("/admin/pristup-na-cekanju");
  }
  const reason = typeof params.reason === "string" ? params.reason : "";
  const message =
    missing.length || reason === "configuration"
      ? "Prijava trenutno nije dostupna. Obratite se administratoru."
      : params.error || reason === "failed"
        ? "Prijava nije uspjela ili pristup nije odobren. Provjerite svoj poslovni račun i pokušajte ponovo."
        : reason === "session"
          ? "Za nastavak je potrebna prijava. Ako je sesija istekla, prijavite se ponovo."
          : reason === "logout"
            ? "Uspješno ste odjavljeni iz PennyPlus portala."
            : "";
  return (
    <main id="sadrzaj" className="admin-auth">
      <div className="admin-auth-theme">
        <ThemeToggle />
      </div>
      <section className="admin-auth-card">
        <Link href="/" aria-label="PennyPlus početna">
          <Image src="/penny.png" alt="PennyPlus" width={72} height={72} />
        </Link>
        <p className="admin-eyebrow">PENNYPLUS · INTERNI PORTAL</p>
        <h1>Vaš prostor za upravljanje.</h1>
        <p>Dobrodošli. Prijavite se poslovnim Microsoft računom za pristup administraciji.</p>
        {message && (
          <p className="admin-notice" role="status">
            {message}
          </p>
        )}
        <form action={microsoftLogin}>
          <button className="admin-button admin-login-button" disabled={missing.length > 0}>
            <span className="microsoft-mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            Prijava poslovnim Microsoft računom
          </button>
        </form>
        <p className="admin-auth-note">
          Pristup imaju ovlašteni zaposlenici s odobrenim korisničkim računom.
        </p>
        <Link href="/" className="admin-back-link">
          ← Nazad na PennyPlus
        </Link>
      </section>
      <p className="admin-auth-footer">PennyPlus · Gradimo povjerenje od 1996.</p>
    </main>
  );
}
