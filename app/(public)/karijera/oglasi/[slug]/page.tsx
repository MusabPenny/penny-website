import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { publishedEntries } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/seo";
import { EntryBody } from "@/components/managed-content";
export const revalidate = 60;
export async function generateStaticParams() {
  return (await publishedEntries("job")).map((e) => ({ slug: e.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = (await publishedEntries("job", { slug, limit: 1, full: true }))[0];
  if (!e) notFound();
  if (e.slug !== slug) permanentRedirect(`/karijera/oglasi/${e.slug}`);
  return pageMetadata(
    e.title,
    (e.summary.length > 40 ? e.summary : "") ||
      `PennyPlus zapošljava: ${e.title}. Pročitajte uslove oglasa i pošaljite prijavu putem našeg obrasca.`,
    `/karijera/oglasi/${slug}`,
  );
}
export default async function Job({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = (await publishedEntries("job", { slug, limit: 1, full: true }))[0];
  if (!e) notFound();
  if (e.slug !== slug) permanentRedirect(`/karijera/oglasi/${e.slug}`);
  return (
    <main id="sadrzaj">
      <PageIntro
        title={e.title}
        description={e.summary}
        eyebrow="OTVORENO RADNO MJESTO"
        path={`/karijera/oglasi/${slug}`}
      />
      <div className="container page-section">
        <article className="prose">
          <EntryBody entry={e} />
          {e.location && <p>Lokacija rada: {e.location}</p>}
          {e.ends_at && (
            <p>
              Rok prijave:{" "}
              {new Intl.DateTimeFormat("bs-BA", {
                dateStyle: "medium",
                timeZone: "Europe/Sarajevo",
              }).format(new Date(e.ends_at))}
            </p>
          )}
          <Link href={`/karijera/prijava?oglas=${e.id}`} className="button button-red">
            Prijavi se na ovaj oglas →
          </Link>
        </article>
      </div>
    </main>
  );
}
