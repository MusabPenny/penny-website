import { requirePermission } from "@/lib/admin/access";
import { adminDatabase } from "@/lib/admin/database";
import { permissionKeys, permits } from "@/lib/admin/policy";
import { MutationForm } from "@/components/admin/mutation-form";
import { AdminHeading, permissionLabels } from "@/components/admin/ui";

export const metadata = { title: "Uloge i dozvole" };
export default async function RolesPage() {
  const actor = await requirePermission("roles.read");
  const roles = await adminDatabase(actor).roles();
  return (
    <>
      <AdminHeading
        eyebrow="KONTROLA PRISTUPA"
        title="Uloge i dozvole"
        description="Svaka uloga ima jasno definisan skup dozvola. Promjene vrijede pri sljedećem zahtjevu."
      />
      <div className="admin-role-grid">
        {roles.map((role) => {
          const editable =
            role.name !== "SUPER_ADMIN" &&
            permits(actor, "roles.manage") &&
            !actor.roles.includes(role.name) &&
            role.permissions.every((p) => actor.permissions.includes(p));
          return (
            <section className="admin-panel admin-role-card" key={role.id}>
              <span className="admin-role-symbol" aria-hidden="true">
                ◇
              </span>
              <h2>{role.name}</h2>
              <p>{role.description}</p>
              <span className="admin-muted">
                {role.permissions.length} od {permissionKeys.length} dozvola
              </span>
              {editable ? (
                <MutationForm action="permissions" targetId={role.id} label="Sačuvaj dozvole">
                  <fieldset>
                    <legend className="sr-only">Dozvole za {role.name}</legend>
                    {permissionKeys.map((key) => (
                      <label className="admin-check" key={key}>
                        <input
                          type="checkbox"
                          name="permissions"
                          value={key}
                          defaultChecked={role.permissions.includes(key)}
                          disabled={!actor.permissions.includes(key)}
                        />
                        {permissionLabels[key]}
                      </label>
                    ))}
                  </fieldset>
                </MutationForm>
              ) : (
                <ul className="admin-permissions">
                  {role.permissions.map((key) => (
                    <li key={key}>✓ {permissionLabels[key]}</li>
                  ))}
                  {!role.permissions.length && <li>Dozvole još nisu dodijeljene.</li>}
                </ul>
              )}
              {role.name === "SUPER_ADMIN" && (
                <p className="admin-notice">Ova uloga ima sve dozvole i zaštićena je od izmjene.</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
