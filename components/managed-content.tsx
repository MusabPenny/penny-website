import Image from "next/image";
import Link from "next/link";
import { assetUrl, type Entry } from "@/lib/cms-types";
export function EntryImage({ entry }: { entry: Entry }) {
  return entry.asset_path && entry.asset_mime?.startsWith("image/") ? (
    <Image
      className="entry-image"
      src={assetUrl(entry.asset_path)}
      alt={entry.title}
      width={1200}
      height={800}
      sizes="(max-width: 760px) 100vw, 60vw"
      style={{ width: "100%", height: "auto", objectFit: "contain" }}
    />
  ) : null;
}
export function EntryBody({ entry }: { entry: Entry }) {
  return (
    <>
      <EntryImage entry={entry} />
      {entry.body
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} style={{ whiteSpace: "pre-line" }}>
            {p}
          </p>
        ))}
      {entry.asset_path && (
        <p>
          <a
            className="text-link"
            href={assetUrl(entry.asset_path)}
            target="_blank"
            rel="noreferrer"
          >
            Otvori prilog: {entry.asset_name ?? entry.title} ↗
          </a>
        </p>
      )}
    </>
  );
}
export function EntryCards({
  entries,
  basePath,
  empty,
}: {
  entries: Entry[];
  basePath?: string;
  empty: string;
}) {
  return entries.length ? (
    <div className="information-grid">
      {entries.map((e) => (
        <article className="information-card" key={e.id}>
          <EntryImage entry={e} />
          <h2>{basePath ? <Link href={`${basePath}/${e.slug}`}>{e.title}</Link> : e.title}</h2>
          <p>{e.summary}</p>
          {e.location && <p>{e.location}</p>}
          {e.ends_at && (
            <p>
              Važi do:{" "}
              {new Intl.DateTimeFormat("bs-BA", {
                dateStyle: "medium",
                timeZone: "Europe/Sarajevo",
              }).format(new Date(e.ends_at))}
            </p>
          )}
          {basePath ? (
            <Link className="text-link" href={`${basePath}/${e.slug}`}>
              Pročitajte više →
            </Link>
          ) : e.asset_path ? (
            <a className="text-link" href={assetUrl(e.asset_path)} target="_blank" rel="noreferrer">
              Otvori {e.asset_mime === "application/pdf" ? "PDF" : "prilog"} ↗
            </a>
          ) : null}
          {e.kind === "partner" && e.source_url && (
            <a href={e.source_url} className="text-link" target="_blank" rel="noreferrer">
              Ponuda brenda ↗
            </a>
          )}
        </article>
      ))}
    </div>
  ) : (
    <div className="team-empty">
      <p>{empty}</p>
      <Link href="/kontakt" className="text-link">
        Kontaktirajte nas →
      </Link>
    </div>
  );
}
