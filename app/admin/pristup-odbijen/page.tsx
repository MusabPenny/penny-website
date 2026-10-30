import Link from "next/link";
import { missingAdminEnvironment } from "@/lib/admin/config";
import { logout } from "../actions";

export const metadata = { title: "Pristup nije odobren" };
export default function DeniedPage() {
  return (
    <main id="sadrzaj" className="admin-auth">
      <section className="admin-auth-card">
        <p className="admin-eyebrow">OGRANIČEN PRISTUP</p>
        <h1>Nemate dozvolu za ovaj dio portala.</h1>
        <p>
          Vaš račun nema potreban pristup ili je deaktiviran. Obratite se administratoru ako
          smatrate da trebate pristup.
        </p>
        <Link href="/admin" className="admin-button">
          Nazad na pregled
        </Link>
        {!missingAdminEnvironment().length && (
          <form action={logout}>
            <button className="admin-button secondary">Odjava i promjena računa</button>
          </form>
        )}
        <Link href="/" className="admin-back-link">
          PennyPlus početna
        </Link>
      </section>
    </main>
  );
}
