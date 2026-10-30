import Link from "next/link";
import type { AuditEntry } from "@/lib/admin/repository";
import type { UserStatus } from "@/lib/admin/policy";

export const statusLabels: Record<UserStatus, string> = {
  APPROVED: "Odobren",
  PENDING: "Na čekanju",
  DISABLED: "Deaktiviran",
};
export const permissionLabels: Record<string, string> = {
  "jobs.manage": "Oglasi za posao",
  "applications.manage": "Prijave za posao i praksu",
  "content.manage": "Novosti, katalozi, akcije i dokumenti",
  "directory.manage": "Lokacije i naš tim",
  "dashboard.read": "Pregled dashboarda",
  "users.read": "Pregled korisnika",
  "users.approve": "Odobravanje korisnika",
  "users.disable": "Deaktivacija korisnika",
  "users.manage_roles": "Dodjela uloga",
  "roles.read": "Pregled uloga",
  "roles.manage": "Uređivanje dozvola",
  "audit.read": "Pregled audit loga",
};
const auditLabels: Record<string, string> = {
  LOGIN_SUCCESS: "Uspješna prijava",
  LOGIN_DENIED: "Pristup odbijen",
  USER_APPROVED: "Korisnik odobren",
  USER_DISABLED: "Korisnik deaktiviran",
  ROLE_ASSIGNED: "Uloga dodijeljena",
  ROLE_REMOVED: "Uloga uklonjena",
  ROLE_PERMISSIONS_UPDATED: "Dozvole uloge ažurirane",
  LOGOUT: "Odjava",
  SUPERADMIN_BOOTSTRAPPED: "Inicijalizovan superadministrator",
};
export function formatDate(date: Date | string | null) {
  return date
    ? new Intl.DateTimeFormat("bs-BA", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Sarajevo",
      }).format(new Date(date))
    : "Još nema prijave";
}
export function AdminHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="admin-heading">
      <p className="admin-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
export function AuditList({ entries }: { entries: AuditEntry[] }) {
  return entries.length ? (
    <ul className="admin-activity">
      {entries.map((entry) => (
        <li key={entry.id}>
          <span className="admin-activity-dot" aria-hidden="true" />
          <div>
            <strong>{auditLabels[entry.action] || "Administratorska aktivnost"}</strong>
            <p>
              {entry.actor_name || "Sistem"} ·{" "}
              {entry.target_type === "role"
                ? "Uloga"
                : entry.target_type === "user"
                  ? "Korisnik"
                  : "Identitet"}
              {entry.target_id ? ` · ${entry.target_id}` : ""}
            </p>
            {Array.isArray(entry.details.after) && (
              <p>
                Dozvole:{" "}
                {entry.details.after
                  .map((key) => permissionLabels[String(key)] || String(key))
                  .join(", ") || "Bez dozvola"}
              </p>
            )}
          </div>
          <time dateTime={new Date(entry.created_at).toISOString()}>
            {formatDate(entry.created_at)}
          </time>
        </li>
      ))}
    </ul>
  ) : (
    <p className="admin-empty">Još nema evidentiranih aktivnosti.</p>
  );
}
export function Pager({
  path,
  page,
  hasNext,
  query = "",
}: {
  path: string;
  page: number;
  hasNext: boolean;
  query?: string;
}) {
  return (
    <nav className="admin-pagination" aria-label="Stranice rezultata">
      {page > 1 && <Link href={`${path}?${query}&page=${page - 1}`}>← Prethodna</Link>}
      <span>Stranica {page}</span>
      {hasNext && <Link href={`${path}?${query}&page=${page + 1}`}>Sljedeća →</Link>}
    </nav>
  );
}
