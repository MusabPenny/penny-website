import Link from "next/link";
import { requirePermission } from "@/lib/admin/access";
import { permits } from "@/lib/admin/policy";
import { adminDatabase } from "@/lib/admin/database";
import { AdminHeading, AuditList } from "@/components/admin/ui";

export const metadata = { title: "Pregled" };
export default async function DashboardPage() {
  const user = await requirePermission("dashboard.read");
  const db = adminDatabase(user);
  const [counts, entries] = await Promise.all([
    permits(user, "users.read") ? db.counts() : null,
    permits(user, "audit.read") ? db.auditEntries() : null,
  ]);
  return (
    <>
      <AdminHeading
        eyebrow="PREGLED PORTALA"
        title={`Dobrodošli, ${user.display_name.split(" ")[0]}.`}
        description="Korisnici, pristup i aktivnosti - sve na jednom mjestu."
      />
      {counts && (
        <div className="admin-stats">
          {[
            ["Ukupno korisnika", counts.total, "Svi registrovani računi"],
            ["Odobreni", counts.approved, "Aktivan interni pristup"],
            ["Na čekanju", counts.pending, "Potrebna provjera administratora"],
            ["Deaktivirani", counts.disabled, "Pristup je onemogućen"],
          ].map(([label, count, note]) => (
            <div className="admin-stat" key={label}>
              <span>{label}</span>
              <strong>{count}</strong>
              <small>{note}</small>
            </div>
          ))}
        </div>
      )}
      <section className="admin-welcome">
        <div>
          <p className="admin-eyebrow">UREĐEN PRISTUP. SIGURAN RAD.</p>
          <h2>Pravi pristup, pravim ljudima.</h2>
          <p>Odobrite nove kolege i dodijelite samo dozvole koje su im potrebne za rad.</p>
        </div>
        {permits(user, "users.read") && (
          <Link href="/admin/korisnici?status=PENDING" className="admin-button">
            Pregledaj zahtjeve →
          </Link>
        )}
      </section>
      {entries && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Posljednje aktivnosti</h2>
            <Link href="/admin/audit">Cijeli audit log →</Link>
          </div>
          <AuditList entries={entries.slice(0, 6)} />
        </section>
      )}
    </>
  );
}
