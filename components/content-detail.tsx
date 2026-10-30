import { notFound, permanentRedirect } from "next/navigation";
import { publishedEntries } from "@/lib/cms";
import { PageIntro } from "@/components/seo";
import { EntryBody } from "@/components/managed-content";
import { canonicalContentAlias } from "@/lib/content-alias";
export async function ContentDetail({ kind, slug }: { kind: "news" | "promotion"; slug: string }) {
  if (kind === "news") canonicalContentAlias(`/novosti/${slug}`);
  const e = (await publishedEntries(kind, { slug, limit: 1, full: true }))[0];
  if (!e) notFound();
  const path = kind === "news" ? "/novosti" : "/akcije";
  if (e.slug !== slug) permanentRedirect(`${path}/${e.slug}`);
  return (
    <main id="sadrzaj">
      <PageIntro
        title={e.title}
        description={e.summary}
        eyebrow={kind === "news" ? "NOVOSTI" : "AKCIJSKA PONUDA"}
        path={`${path}/${slug}`}
      />
      <div className="container page-section">
        <article className="prose">
          <time dateTime={e.starts_at}>
            {new Intl.DateTimeFormat("bs-BA", {
              dateStyle: "long",
              timeZone: "Europe/Sarajevo",
            }).format(new Date(e.starts_at))}
          </time>
          <EntryBody entry={e} />
          {e.ends_at && (
            <p>
              Važi do:{" "}
              {new Intl.DateTimeFormat("bs-BA", {
                dateStyle: "long",
                timeZone: "Europe/Sarajevo",
              }).format(new Date(e.ends_at))}
            </p>
          )}
        </article>
      </div>
    </main>
  );
}
