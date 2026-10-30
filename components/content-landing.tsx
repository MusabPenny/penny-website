import { PageIntro } from "@/components/seo";
import { EntryCards } from "@/components/managed-content";
import { publishedEntries } from "@/lib/cms";
import type { ContentKind } from "@/lib/cms-types";
export async function ContentLanding({
  kind,
  title,
  description,
  path,
  empty,
  basePath,
}: {
  kind: ContentKind;
  title: string;
  description: string;
  path: string;
  empty: string;
  basePath?: string;
}) {
  return (
    <main id="sadrzaj">
      <PageIntro title={title} description={description} eyebrow="PENNYPLUS" path={path} />
      <div className="container page-section">
        {kind === "document" && (
          <p className="data-note">
            Datum izdavanja i period na koji se dokument odnosi navedeni su u svakom PDF-u.
          </p>
        )}
        <EntryCards entries={await publishedEntries(kind)} basePath={basePath} empty={empty} />
      </div>
    </main>
  );
}
