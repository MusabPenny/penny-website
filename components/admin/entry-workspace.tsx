import Link from "next/link";
import { notFound } from "next/navigation";
import { contentKinds, kindLabels, type ContentKind, type Entry } from "@/lib/cms-types";
import { ContentForm } from "./content-form";
import { EntryTable } from "./entry-table";
import { AdminHeading } from "./ui";
import { Icon } from "@/components/icon";
export function EntryWorkspace({
  entries,
  kind,
  edit,
  create,
  now,
  total,
  page,
  filters,
  missingDeadlines,
}: {
  entries: Entry[];
  kind: ContentKind;
  edit?: string;
  create?: string;
  now: number;
  total: number;
  page?: number;
  filters?: { query?: string; status?: string; sort?: string };
  missingDeadlines?: { id: string; title: string }[];
}) {
  const isJob = kind === "job";
  const base = isJob ? "/admin/oglasi" : `/admin/sadrzaj?kind=${kind}`;
  const entry = edit ? entries.find((e) => e.id === edit) : undefined;
  if (edit && !entry) notFound();
  const editing = Boolean(edit || create === "1");
  return (
    <>
      <div className="admin-page-heading">
        <AdminHeading
          eyebrow={isJob ? "KARIJERA" : "SADRŽAJ I MARKETING"}
          title={
            editing
              ? entry
                ? "Uredi objavu"
                : isJob
                  ? "Novi oglas"
                  : "Nova objava"
              : kindLabels[kind]
          }
          description={
            editing
              ? "Pripremite sadržaj, odaberite status i sačuvajte promjene."
              : isJob
                ? "Upravljajte oglasima i pratite rokove za prijave."
                : "Vaše objave, pregledno i na jednom mjestu."
          }
        />
        {isJob && !editing && (
          <Link className="admin-button secondary" href="/admin/prijave">
            Prijave kandidata <Icon name="arrow" size={16} />
          </Link>
        )}
      </div>
      {!isJob && !editing && (
        <nav className="admin-content-tabs" aria-label="Vrsta sadržaja">
          {contentKinds
            .filter((k) => k !== "job")
            .map((k) => (
              <Link
                key={k}
                href={`/admin/sadrzaj?kind=${k}`}
                aria-current={kind === k ? "page" : undefined}
              >
                {kindLabels[k]}
              </Link>
            ))}
        </nav>
      )}
      {editing ? (
        <>
          <Link href={base} className="admin-back-link">
            ← Nazad na {isJob ? "oglase" : "listu objava"}
          </Link>
          <section className="admin-panel admin-editor-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>{entry?.title ?? (isJob ? "Detalji novog oglasa" : "Detalji nove objave")}</h2>
                <p>{kindLabels[kind]} · Polja sa sadržajem možete mijenjati prije objave.</p>
              </div>
            </div>
            <ContentForm key={entry?.id ?? "new"} kind={kind} entry={entry} />
          </section>
        </>
      ) : (
        <EntryTable
          key={`${page}-${JSON.stringify(filters)}`}
          entries={entries}
          kind={kind}
          now={now}
          total={total}
          page={page}
          filters={filters}
          missingDeadlines={missingDeadlines}
        />
      )}
    </>
  );
}
