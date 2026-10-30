import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/admin/access";
import { logout } from "../actions";

export const metadata = { title: "Pristup na čekanju" };
export default async function WaitingPage() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/admin/login?reason=session");
  if (user.status === "APPROVED") redirect("/admin");
  if (user.status === "DISABLED") redirect("/admin/pristup-odbijen");
  return (
    <main id="sadrzaj" className="admin-auth">
      <section className="admin-auth-card">
        <p className="admin-eyebrow">JOŠ JEDAN KORAK</p>
        <h1>Vaš pristup čeka odobrenje.</h1>
        <p>
          Prijavljeni ste kao {user.display_name}. Administrator treba odobriti vaš račun i
          dodijeliti potrebne dozvole.
        </p>
        <Link href="/admin" className="admin-button">
          Provjeri status pristupa
        </Link>
        <form action={logout}>
          <button className="admin-button secondary">Odjava</button>
        </form>
      </section>
    </main>
  );
}
