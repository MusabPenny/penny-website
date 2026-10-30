import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DirectoryRecord } from "@/lib/directory-types";
import { AdminHeading } from "@/components/admin/ui";
import { DirectoryForm } from "@/components/admin/directory-form";
export default async function DirectoryAdmin({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; edit?: string; new?: string; q?: string }>;
}) {
  const user = await requirePermission("directory.manage");
  const params = await searchParams;
  const kind = params.kind === "member" ? "member" : "location";
  const { data, error } = await createAdminClient().rpc("penny_directory_admin", {
    p_tenant_id: user.tenant_id,
    p_object_id: user.object_id,
    p_action: "list",
    p_payload: { kind },
  });
  if (error && !["PGRST202", "42883"].includes(error.code))
    throw new Error("Imenik nije dostupan.");
  const rows = (data ?? []) as DirectoryRecord[];
  const entry = rows.find((row) => row.id === params.edit);
  if (params.edit && !entry) notFound();
  const editing = params.new === "1" || Boolean(entry);
  return (
    <>
      <AdminHeading
        eyebrow="IMENIK"
        title="Lokacije i naš tim"
        description="Uređujte javne kontakte, radno vrijeme i članove tima bez promjene koda."
      />
      <nav className="admin-content-tabs">
        <Link
          href="/admin/imenik?kind=location"
          aria-current={kind === "location" ? "page" : undefined}
        >
          Lokacije
        </Link>
        <Link
          href="/admin/imenik?kind=member"
          aria-current={kind === "member" ? "page" : undefined}
        >
          Naš tim
        </Link>
      </nav>
      {error ? (
        <p className="admin-deadline-warning">
          Imenik će biti dostupan nakon primjene migracija 006 i 007. Javni prikaz do tada koristi
          postojeće podatke.
        </p>
      ) : editing ? (
        <section className="admin-panel admin-notification-panel">
          <Link className="admin-back-link" href={`/admin/imenik?kind=${kind}`}>
            ← Nazad na imenik
          </Link>
          <DirectoryForm kind={kind} entry={entry} />
        </section>
      ) : (
        <section className="admin-panel admin-list-panel">
          <div className="admin-list-heading">
            <h2>
              {kind === "member" ? "Članovi tima" : "Lokacije"} · {rows.length}
            </h2>
            <Link className="admin-button" href={`/admin/imenik?kind=${kind}&new=1`}>
              {kind === "member" ? "Nova osoba" : "Nova lokacija"}
            </Link>
          </div>
          <form className="admin-list-toolbar">
            <input type="hidden" name="kind" value={kind} />
            <label className="admin-search">
              <input
                type="search"
                name="q"
                aria-label="Pretraži imenik"
                placeholder={
                  kind === "location" ? "Pretraži naziv ili tip objekta…" : "Pretraži ime…"
                }
                defaultValue={params.q}
              />
            </label>
            <button className="admin-button secondary">Pretraži</button>
          </form>
          <div className="admin-table-scroll">
            <table className="admin-table admin-responsive-table">
              <thead>
                <tr>
                  <th>Naziv</th>
                  <th>Status</th>
                  <th>Radnja</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((row) =>
                    `${row.data.name} ${"type" in row.data ? row.data.type : ""}`
                      .toLocaleLowerCase("bs")
                      .includes((params.q ?? "").toLocaleLowerCase("bs")),
                  )
                  .map((row) => (
                    <tr key={row.id}>
                      <td className="admin-primary-cell" data-label="Naziv">
                        <span className="admin-record-title">{row.data.name}</span>
                        {kind === "location" && "type" in row.data && (
                          <div className="admin-record-meta">
                            <span className="admin-status">
                              {row.data.type === "PennyPlus"
                                ? "Plus"
                                : row.data.type === "Penny marketi"
                                  ? "Market"
                                  : row.data.type === "Toys&Fun igraonice"
                                    ? "Toys&Fun"
                                    : row.data.type}
                            </span>
                          </div>
                        )}
                      </td>
                      <td data-label="Status">{row.published ? "Javno" : "Sakriveno"}</td>
                      <td className="admin-actions-cell" data-label="Radnja">
                        <Link
                          className="admin-edit-button"
                          href={`/admin/imenik?kind=${kind}&edit=${row.id}`}
                        >
                          Uredi
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
