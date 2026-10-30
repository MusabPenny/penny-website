import { requirePermission } from "@/lib/admin/access";
import { adminDatabase } from "@/lib/admin/database";
import { permits, type UserStatus } from "@/lib/admin/policy";
import { MutationForm } from "@/components/admin/mutation-form";
import { AdminHeading, formatDate, Pager, statusLabels } from "@/components/admin/ui";

export const metadata = { title: "Korisnici" };
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("users.read");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const status =
    typeof params.status === "string" && ["PENDING", "APPROVED", "DISABLED"].includes(params.status)
      ? params.status
      : "";
  const page = Math.min(10000, Math.max(1, Number(params.page) || 1)) | 0;
  const db = adminDatabase(actor);
  const [{ users, total }, roles] = await Promise.all([
    db.users(q, status, page),
    permits(actor, "users.manage_roles") ? db.roles() : Promise.resolve([]),
  ]);
  return (
    <>
      <AdminHeading
        eyebrow="UPRAVLJANJE PRISTUPOM"
        title="Korisnici"
        description="Pregled poslovnih računa, odobrenja i internih uloga."
      />
      <section className="admin-panel">
        <form className="admin-filters" action="/admin/korisnici">
          <label>
            Pretraga
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Ime ili email"
              maxLength={100}
            />
          </label>
          <label>
            Status
            <select name="status" defaultValue={status}>
              <option value="">Svi statusi</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="admin-button">Pretraži</button>
          <span>{total} korisnika</span>
        </form>
        <div className="admin-table-scroll">
          <table className="admin-table admin-responsive-table admin-users-table">
            <caption className="sr-only">Poslovni računi, statusi i dodijeljene uloge</caption>
            <thead>
              <tr>
                <th>Korisnik</th>
                <th>Status</th>
                <th>Uloge</th>
                <th>Posljednja prijava</th>
                <th>Radnje</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = actor.id === user.id;
                const protectedTarget =
                  user.roles.includes("SUPER_ADMIN") && !actor.roles.includes("SUPER_ADMIN");
                return (
                  <tr key={user.id}>
                    <td data-label="Korisnik" className="admin-primary-cell">
                      <strong>{user.display_name}</strong>
                      <small>{user.email || "Email nije dostupan"}</small>
                      {isSelf && <small>Vaš račun</small>}
                    </td>
                    <td data-label="Status">
                      <span className={`admin-status ${user.status.toLowerCase()}`}>
                        {statusLabels[user.status as UserStatus]}
                      </span>
                    </td>
                    <td data-label="Uloge">
                      <div className="admin-tags">
                        {user.roles.length ? (
                          user.roles.map((role) => <span key={role}>{role}</span>)
                        ) : (
                          <span>Bez uloge</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Posljednja prijava">{formatDate(user.last_login_at)}</td>
                    <td data-label="Radnje" className="admin-actions-cell">
                      <div className="admin-user-actions">
                        {!isSelf && !protectedTarget && (
                          <details className="admin-user-manage">
                            <summary className="admin-edit-button">Upravljaj pristupom</summary>
                            <div className="admin-access-options">
                              {user.status !== "APPROVED" && permits(actor, "users.approve") && (
                                <MutationForm
                                  action="approve"
                                  targetId={user.id}
                                  label="Odobri korisnika"
                                />
                              )}
                              {user.status !== "DISABLED" && permits(actor, "users.disable") && (
                                <MutationForm
                                  action="disable"
                                  targetId={user.id}
                                  label="Deaktiviraj korisnika"
                                />
                              )}
                              {permits(actor, "users.manage_roles") &&
                                roles
                                  .filter(
                                    (role) =>
                                      (role.name !== "SUPER_ADMIN" ||
                                        actor.roles.includes("SUPER_ADMIN")) &&
                                      role.permissions.every((p) => actor.permissions.includes(p)),
                                  )
                                  .map((role) => (
                                    <MutationForm
                                      key={role.id}
                                      action={user.roles.includes(role.name) ? "remove" : "assign"}
                                      targetId={user.id}
                                      roleId={role.id}
                                      label={`${user.roles.includes(role.name) ? "Ukloni" : "Dodijeli"} ${role.name}`}
                                    />
                                  ))}
                            </div>
                          </details>
                        )}
                        {(isSelf ||
                          protectedTarget ||
                          (!permits(actor, "users.approve") &&
                            !permits(actor, "users.disable") &&
                            !permits(actor, "users.manage_roles"))) && (
                          <span className="admin-muted">Samo pregled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!users.length && <p className="admin-empty">Nema korisnika za odabrane filtere.</p>}
        <Pager
          path="/admin/korisnici"
          page={page}
          hasNext={page * 25 < total}
          query={new URLSearchParams({ q, status }).toString()}
        />
      </section>
    </>
  );
}
