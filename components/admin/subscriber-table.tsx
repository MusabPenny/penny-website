"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { deleteSubscriber } from "@/app/(public)/newsletter/actions";
export type SubscriberRow = {
  id: string;
  email: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
};
function RemoveSubscriber({ entry }: { entry: SubscriberRow }) {
  const [message, action, pending] = useActionState(async (_previous: string, data: FormData) => {
    try {
      await deleteSubscriber(data);
      return "Podaci su obrisani.";
    } catch {
      return "Brisanje nije uspjelo. Pokušajte ponovo.";
    }
  }, "");
  return (
    <details className="admin-row-disclosure">
      <summary>Obriši podatke</summary>
      <form action={action} className="admin-row-confirm">
        <input type="hidden" name="id" value={entry.id} />
        <label>
          <input type="checkbox" required />
          Potvrđujem brisanje ove prijave.
        </label>
        <button className="admin-button secondary" disabled={pending}>
          {pending ? "Brisanje…" : "Potvrdi brisanje"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
export function SubscriberTable({
  entries,
  total,
  page = 1,
  query = "",
  status = "",
}: {
  entries: SubscriberRow[];
  total: number;
  page?: number;
  query?: string;
  status?: string;
}) {
  const filtered = entries;
  const pages = Math.max(1, Math.ceil(total / 15));
  const current = page;
  const pageHref = (p: number) =>
    "/admin/newsletter?" + new URLSearchParams({ query, status, page: String(p) });
  return (
    <section className="admin-panel admin-list-panel">
      <div className="admin-list-heading">
        <div>
          <h2>
            Pretplatnici <span className="admin-count">{total}</span>
          </h2>
          <p>Prijave i odjave na jednom mjestu.</p>
        </div>
      </div>
      <form className="admin-list-toolbar">
        <label className="admin-search">
          <Icon name="search" size={18} />
          <input
            type="search"
            aria-label="Pretraži pretplatnike"
            placeholder="Pretraži e-mail adresu…"
            name="query"
            defaultValue={query}
          />
        </label>
        <label className="admin-select-label">
          <span>Status</span>
          <select name="status" defaultValue={status}>
            <option value="">Svi pretplatnici</option>
            <option value="active">Prijavljeni</option>
            <option value="inactive">Odjavljeni</option>
          </select>
        </label>
        <button className="admin-button secondary">Primijeni</button>
      </form>
      {filtered.length ? (
        <div className="admin-table-scroll">
          <table className="admin-table admin-responsive-table">
            <caption className="sr-only">Newsletter pretplatnici</caption>
            <thead>
              <tr>
                <th scope="col">E-mail adresa</th>
                <th scope="col">Status</th>
                <th scope="col">Datum prijave</th>
                <th scope="col" className="admin-actions-heading">
                  Radnje
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td data-label="E-mail" className="admin-primary-cell">
                    <span className="admin-record-title">{e.email}</span>
                  </td>
                  <td data-label="Status">
                    <span className={`admin-status ${e.unsubscribed_at ? "disabled" : "approved"}`}>
                      {e.unsubscribed_at ? "Odjavljen" : "Prijavljen"}
                    </span>
                  </td>
                  <td data-label="Prijava">
                    <time dateTime={e.subscribed_at}>
                      {new Intl.DateTimeFormat("bs-BA", {
                        dateStyle: "medium",
                        timeZone: "Europe/Sarajevo",
                      }).format(new Date(e.subscribed_at))}
                    </time>
                  </td>
                  <td data-label="Radnje" className="admin-actions-cell">
                    <RemoveSubscriber entry={e} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-list-empty">
          <h3>Nema pretplatnika za ovaj pregled</h3>
          <p>Promijenite pretragu ili status.</p>
        </div>
      )}
      <div className="admin-list-footer">
        <span role="status">
          {filtered.length
            ? `${(current - 1) * 15 + 1}–${Math.min(current * 15, total)} od ${total}`
            : "0 rezultata"}
        </span>
        <nav className="admin-page-controls" aria-label="Stranice pretplatnika">
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
