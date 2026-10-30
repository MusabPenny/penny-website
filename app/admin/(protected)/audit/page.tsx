import { requirePermission } from "@/lib/admin/access";
import { adminDatabase } from "@/lib/admin/database";
import { AdminHeading, AuditList, Pager } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("audit.read");
  const params = await searchParams;
  const page = Math.min(10000, Math.max(1, Number(params.page) || 1)) | 0;
  const entries = await adminDatabase(actor).auditEntries(page);
  return (
    <>
      <AdminHeading
        eyebrow="EVIDENCIJA PROMJENA"
        title="Audit log"
        description="Prijave, odobrenja i promjene dozvola. Evidencija se kreira na serveru i nije dostupna za uređivanje."
      />
      <section className="admin-panel">
        <AuditList entries={entries} />
        <Pager path="/admin/audit" page={page} hasNext={entries.length === 30} />
      </section>
    </>
  );
}
