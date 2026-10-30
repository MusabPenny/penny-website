import Link from "next/link";
import { requirePermission } from "@/lib/admin/access";
import { contentAdmin } from "@/lib/cms";
import { applicationStatuses, type Application } from "@/lib/cms-types";
import { AdminHeading, formatDate, Pager } from "@/components/admin/ui";
export default async function ApplicationsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string; page?: string }>;
}) {
  const user = await requirePermission("applications.manage");
  const p = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(p.page) || 1));
  const entries = await contentAdmin<Application[]>(user, "applications", {
    status: p.status ?? "",
    kind: p.kind ?? "",
    page,
  });
  return (
    <>
      <AdminHeading
        eyebrow="KANDIDATI"
        title="Prijave za posao i praksu"
        description="Privatni podaci kandidata dostupni su samo ovlaštenim administratorima."
      />
      <section className="admin-panel admin-list-panel">
        <div className="admin-list-heading">
          <div>
            <h2>Pregled kandidata</h2>
            <p>Otvorite prijavu za sve podatke i obradu.</p>
          </div>
        </div>
        <form className="admin-filters">
          <label>
            Status
            <select name="status" defaultValue={p.status ?? ""}>
              <option value="">Svi statusi</option>
              {Object.entries(applicationStatuses).map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vrsta
            <select name="kind" defaultValue={p.kind ?? ""}>
              <option value="">Sve prijave</option>
              <option value="job">Posao</option>
              <option value="internship">Praksa</option>
            </select>
          </label>
          <button className="admin-button">Filtriraj</button>
        </form>
        {!entries.length ? (
          <div className="admin-list-empty">
            <h3>Nema prijava za odabrane filtere</h3>
            <p>Promijenite status ili vrstu prijave.</p>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table admin-responsive-table">
              <caption className="sr-only">Lista prijava kandidata</caption>
              <thead>
                <tr>
                  <th scope="col">Kandidat</th>
                  <th scope="col">Radno mjesto</th>
                  <th scope="col">Status</th>
                  <th scope="col">Zaprimljeno</th>
                  <th scope="col" className="admin-actions-heading">
                    Radnje
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td data-label="Kandidat" className="admin-primary-cell">
                      <Link className="admin-record-title" href={`/admin/prijave/${e.id}`}>
                        {e.first_name} {e.last_name}
                      </Link>
                      <small>{e.email}</small>
                    </td>
                    <td data-label="Radno mjesto">
                      {e.job_title}
                      <small>{e.kind === "job" ? "Prijava za posao" : "Stručna praksa"}</small>
                    </td>
                    <td data-label="Status">
                      <span className={`admin-status ${e.status.toLowerCase()}`}>
                        {applicationStatuses[e.status]}
                      </span>
                    </td>
                    <td data-label="Zaprimljeno" className="admin-date-cell">
                      <time dateTime={e.created_at}>{formatDate(e.created_at)}</time>
                    </td>
                    <td data-label="Radnje" className="admin-actions-cell">
                      <Link className="admin-edit-button" href={`/admin/prijave/${e.id}`}>
                        Otvori prijavu →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager
          path="/admin/prijave"
          page={page}
          hasNext={entries.length === 25}
          query={new URLSearchParams({ status: p.status ?? "", kind: p.kind ?? "" }).toString()}
        />
      </section>
    </>
  );
}
