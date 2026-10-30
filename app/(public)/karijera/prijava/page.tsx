import { PageIntro } from "@/components/seo";
import { ApplicationForm } from "@/components/application-form";
import { publishedEntries } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Prijava za posao",
  "Pošaljite prijavu za posao u PennyPlusu. Odaberite otvoreni oglas ili pošaljite otvorenu prijavu uz biografiju.",
  "/karijera/prijava",
);
export default async function Apply({
  searchParams,
}: {
  searchParams: Promise<{ oglas?: string }>;
}) {
  const [jobs, params] = await Promise.all([publishedEntries("job"), searchParams]);
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Prijava za posao"
        description="Predstavite nam svoje iskustvo i interesovanja. Prijavu obrađuje naš tim kroz interni sistem."
        eyebrow="PRIDRUŽITE NAM SE"
        path="/karijera/prijava"
      />
      <div className="container page-section">
        <ApplicationForm
          kind="job"
          jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
          selectedJob={jobs.find((j) => j.id === params.oglas)?.id ?? ""}
        />
      </div>
    </main>
  );
}
