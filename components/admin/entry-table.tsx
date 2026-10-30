"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { archiveContent } from "@/app/admin/content-actions";
import { assetUrl, type ContentKind, type Entry } from "@/lib/cms-types";
import { entryStatus, entryStatusLabels } from "@/lib/admin/entry-list";

function date(value: string) {
  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Sarajevo",
  }).format(new Date(value));
}
function ArchiveEntry({ entry }: { entry: Entry }) {
  const [state, action, pending] = useActionState(async () => {
    try {
      const form = new FormData();
      form.set("kind", entry.kind);
      form.set("id", entry.id);
      form.set("version", entry.updated_at);
      await archiveContent(form);
      return "Sadržaj je arhiviran.";
    } catch {
      return "Arhiviranje nije uspjelo. Osvježite listu i pokušajte ponovo.";
    }
  }, "");
  return (
    <details className="admin-row-disclosure">
      <summary>Arhiviraj</summary>
      <form action={action} className="admin-row-confirm">
        <p>Ukloniti iz javnog prikaza?</p>
        <button className="admin-button secondary" disabled={pending}>
          {pending ? "Arhiviranje…" : "Potvrdi arhiviranje"}
        </button>
        {state && <p role="status">{state}</p>}
      </form>
    </details>
  );
}
export function EntryTable({
  entries,
  kind,
  now,
  total,
  page = 1,
  filters = {},
  missingDeadlines = [],
}: {
  entries: Entry[];
  kind: ContentKind;
  now: number;
  total: number;
  page?: number;
  filters?: { query?: string; status?: string; sort?: string };
  missingDeadlines?: { id: string; title: string }[];
}) {
  const query = filters.query ?? "",
    status = filters.status ?? "",
    sort = filters.sort ?? "newest";
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = page;
  const visible = entries;
  const path = kind === "job" ? "/admin/oglasi" : `/admin/sadrzaj?kind=${kind}`;
  const editHref = (id: string) => `${path}${path.includes("?") ? "&" : "?"}edit=${id}`;
  const newHref = `${path}${path.includes("?") ? "&" : "?"}new=1`;
  const activeFilters = Boolean(query || status);
  const pageHref = (target: number) => {
    const params = new URLSearchParams({ query, status, sort, page: String(target) });
    if (kind !== "job") params.set("kind", kind);
    return `${kind === "job" ? "/admin/oglasi" : "/admin/sadrzaj"}?${params}`;
  };
  return (
    <section
      className="admin-panel admin-list-panel"
      aria-label={kind === "job" ? "Lista oglasa" : "Lista objava"}
    >
      <div className="admin-list-heading">
        <div>
          <h2>
            {kind === "job" ? "Svi oglasi" : "Sve objave"}{" "}
            <span className="admin-count">{total}</span>
          </h2>
          <p>Pronađite, uredite i pratite svoje objave.</p>
        </div>
        <Link href={newHref} className="admin-button">
          <Icon name="plus" size={17} />
          {kind === "job" ? "Novi oglas" : "Nova objava"}
        </Link>
      </div>
      {kind === "job" && missingDeadlines.length > 0 && (
        <aside className="admin-deadline-warning" aria-label="Provjera rokova oglasa">
          <strong>Dopunite rokove: {missingDeadlines.length} oglasa nema rok za prijave.</strong>
          <p>
            Otvorite oglas, provjerite originalni prilog i unesite rok ili ga arhivirajte ako je
            konkurs završen.
          </p>
          <ul>
            {missingDeadlines.map((e) => (
              <li key={e.id}>
                <Link href={editHref(e.id)}>{e.title} →</Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
      <form className="admin-list-toolbar">
        {kind !== "job" && <input type="hidden" name="kind" value={kind} />}
        <label className="admin-search">
          <Icon name="search" size={18} />
          <input
            type="search"
            aria-label="Pretraži objave"
            placeholder="Pretraži po naslovu…"
            name="query"
            defaultValue={query}
          />
        </label>
        <label className="admin-select-label">
          <span>Status</span>
          <select aria-label="Filtriraj objave po statusu" name="status" defaultValue={status}>
            <option value="">Svi statusi</option>
            {Object.entries(entryStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-select-label">
          <span>Poredak</span>
          <select aria-label="Poredak objava" name="sort" defaultValue={sort}>
            <option value="newest">Najnovije objave</option>
            <option value="updated">Nedavno uređeno</option>
            <option value="oldest">Najstarije objave</option>
            <option value="title">Naslov A–Ž</option>
          </select>
        </label>
        <button className="admin-button secondary">Primijeni</button>
      </form>
      {activeFilters && (
        <div className="admin-filter-summary" role="status">
          <span>
            {total} rezultata {query && <>za „{query}“</>}
          </span>
          <Link href={path}>
            Poni?ti filtere <Icon name="close" size={13} />
          </Link>
        </div>
      )}
      {visible.length ? (
        <div className="admin-table-scroll">
          <table className="admin-table admin-responsive-table admin-entry-table">
            <caption className="sr-only">
              {kind === "job" ? "Oglasi za posao" : "Objave"} — naslov, status, datumi i radnje
            </caption>
            <thead>
              <tr>
                <th scope="col">Naslov</th>
                <th scope="col">Status</th>
                <th scope="col">Objava</th>
                <th scope="col">Posljednja izmjena</th>
                <th scope="col" className="admin-actions-heading">
                  Radnje
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => {
                const state = entryStatus(entry, now);
                const preview =
                  entry.kind === "news"
                    ? `/novosti/${entry.slug}`
                    : entry.kind === "job"
                      ? `/karijera/oglasi/${entry.slug}`
                      : entry.kind === "promotion"
                        ? `/akcije/${entry.slug}`
                        : entry.asset_path
                          ? assetUrl(entry.asset_path)
                          : entry.source_url;
                return (
                  <tr key={entry.id}>
                    <td data-label="Naslov" className="admin-primary-cell">
                      <Link className="admin-record-title" href={editHref(entry.id)}>
                        {entry.title}
                      </Link>
                      <div className="admin-record-meta">
                        {entry.asset_path && (
                          <span>
                            <Icon name="file" size={13} />
                            {entry.asset_mime === "application/pdf" ? "PDF dokument" : "Prilog"}
                          </span>
                        )}
                        {entry.location && <span>{entry.location}</span>}
                        <span>/{entry.slug}</span>
                      </div>
                    </td>
                    <td data-label="Status">
                      <span className={`admin-status ${state.toLowerCase()}`}>
                        <i aria-hidden="true" />
                        {entryStatusLabels[state]}
                      </span>
                    </td>
                    <td data-label="Objava" className="admin-date-cell">
                      <time dateTime={entry.starts_at}>{date(entry.starts_at)}</time>
                      {entry.ends_at && <small>Do {date(entry.ends_at)}</small>}
                    </td>
                    <td data-label="Izmjena" className="admin-date-cell">
                      <time dateTime={entry.updated_at}>{date(entry.updated_at)}</time>
                    </td>
                    <td data-label="Radnje" className="admin-actions-cell">
                      <div className="admin-record-actions">
                        <Link href={editHref(entry.id)} className="admin-edit-button">
                          <Icon name="edit" size={15} />
                          Uredi<span className="sr-only">: {entry.title}</span>
                        </Link>
                        {state === "PUBLISHED" && preview && (
                          <a
                            className="admin-preview-button"
                            href={preview}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Otvori javni prikaz: ${entry.title}`}
                          >
                            <Icon name="diagonal" size={17} />
                            Pregled
                          </a>
                        )}
                        {entry.status !== "ARCHIVED" && <ArchiveEntry entry={entry} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-list-empty">
          <span className="admin-empty-symbol">
            <Icon name="search" size={25} />
          </span>
          <h3>{activeFilters ? "Nema rezultata za ovu pretragu" : "Još nema objava"}</h3>
          <p>
            {activeFilters
              ? "Pokušajte s drugim naslovom ili promijenite status."
              : "Kreirajte prvu objavu i sačuvajte je kao nacrt ili je objavite."}
          </p>
          {!activeFilters && (
            <Link className="admin-button secondary" href={newHref}>
              Kreiraj prvu objavu
            </Link>
          )}
        </div>
      )}
      <div className="admin-list-footer">
        <span role="status">
          {total
            ? `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, total)} od ${total}`
            : "0 rezultata"}
        </span>
        <nav className="admin-page-controls" aria-label="Stranice objava">
          {current > 1 && (
            <Link className="admin-edit-button" href={pageHref(current - 1)}>
              ? Prethodna
            </Link>
          )}
          <span>
            {current} / {pages}
          </span>
          {current < pages && (
            <Link className="admin-edit-button" href={pageHref(current + 1)}>
              Sljede?a ?
            </Link>
          )}
        </nav>
      </div>
    </section>
  );
}
