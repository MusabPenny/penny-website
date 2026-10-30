import Link from "next/link";
import { requirePermission } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeading } from "@/components/admin/ui";
import { MailSettingsForm } from "@/components/admin/mail-settings-form";
import { microsoftMailConfigured } from "@/lib/microsoft-mail";
import type { MailWorkspace } from "@/lib/recruitment-mail";
import { retryMail, runMailQueue } from "@/app/admin/notification-actions";
import { Pager } from "@/components/admin/ui";

const statuses: Record<string, string> = {
  pending: "Na čekanju",
  processing: "Obrada — provjeriti ako traje",
  accepted: "Microsoft 365 prihvatio slanje",
  failed: "Nije poslano",
  uncertain: "Ishod nepoznat — provjerite Sent Items",
};
export default async function Notifications({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await requirePermission("applications.manage");
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(params.page) || 1)));
  const { data, error } = await createAdminClient().rpc("penny_mail_workspace", {
    p_tenant_id: user.tenant_id,
    p_object_id: user.object_id,
    p_payload: { status: params.status ?? "", page },
  });
  if (error && !["PGRST202", "42883"].includes(error.code))
    throw new Error("Postavke obavijesti nisu dostupne.");
  const workspace = data as (MailWorkspace & { total: number }) | null;
  return (
    <>
      <AdminHeading
        eyebrow="KARIJERA"
        title="E-mail obavijesti"
        description="Microsoft 365 potvrde kandidatima i obavijesti HR timu za nove prijave."
      />
      {!workspace ? (
        <section className="admin-panel admin-notification-panel">
          <h2>Potrebno je postavljanje baze</h2>
          <p>
            Postavke će biti dostupne nakon primjene migracije 006_operational_cms.sql. Postojeće
            prijave rade bez e-mail obavijesti.
          </p>
        </section>
      ) : (
        <>
          <section className="admin-panel admin-notification-panel">
            <h2>Primaoci i slanje</h2>
            {!microsoftMailConfigured() && (
              <p className="admin-deadline-warning">
                Microsoft 365 još nije povezan. Možete sačuvati adrese, a slanje uključiti nakon
                serverske konfiguracije.
              </p>
            )}
            <MailSettingsForm
              settings={workspace.settings}
              configured={microsoftMailConfigured()}
            />
          </section>
          <section className="admin-panel admin-list-panel">
            <div className="admin-list-heading">
              <div>
                <h2>Red obavijesti · {workspace.total}</h2>
                <p>
                  Prihvaćeno slanje nije potvrda dostave. Kod nepoznatog ishoda prvo provjerite
                  mailbox kako biste izbjegli duplikate.
                </p>
              </div>
            </div>
            <form className="admin-list-toolbar">
              <label className="admin-select-label">
                Status
                <select name="status" defaultValue={params.status ?? ""}>
                  <option value="">Svi statusi</option>
                  {Object.entries(statuses).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="admin-button secondary">Filtriraj</button>
            </form>
            {workspace.settings.enabled && (
              <form action={runMailQueue} className="admin-list-toolbar">
                <button className="admin-edit-button">Obradi dospjele obavijesti</button>
              </form>
            )}
            <div className="admin-table-scroll">
              <table className="admin-table admin-responsive-table">
                <thead>
                  <tr>
                    <th>Prijava</th>
                    <th>Primalac</th>
                    <th>Status</th>
                    <th>Radnja</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.queue.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Prijava" className="admin-primary-cell">
                        <Link href={`/admin/prijave/${item.application_id}`}>Otvori prijavu →</Link>
                      </td>
                      <td data-label="Primalac">
                        {item.audience === "hr" ? "HR tim" : "Kandidat"}
                      </td>
                      <td data-label="Status">
                        {statuses[item.status]}
                        <small>Pokušaja: {item.attempts}</small>
                      </td>
                      <td data-label="Radnja" className="admin-actions-cell">
                        {["pending", "failed"].includes(item.status) &&
                          item.attempts < 5 &&
                          workspace.settings.enabled && (
                            <form action={retryMail}>
                              <input type="hidden" name="id" value={item.id} />
                              <button className="admin-edit-button">Pokušaj ponovo</button>
                            </form>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!workspace.queue.length && (
              <p className="admin-empty">
                Još nema obavijesti. Red se kreira za nove prijave kada uključite slanje.
              </p>
            )}
            <Pager
              path="/admin/obavijesti"
              page={page}
              hasNext={page * 25 < workspace.total}
              query={new URLSearchParams({ status: params.status ?? "" }).toString()}
            />
          </section>
        </>
      )}
    </>
  );
}
