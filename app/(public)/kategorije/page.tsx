import { CategoryExplorer } from "@/components/interactive";
import { PageIntro, JsonLd } from "@/components/seo";
import { categories } from "@/lib/content";
import { pageMetadata, absoluteUrl } from "@/lib/seo";

const description =
  "Pregledajte 35 kategorija za dom, gradnju, vrt i svakodnevni život. Svaka kategorija vodi direktno na odgovarajuću ponudu PennyShopa.";
export const metadata = pageMetadata(
  "Kategorije za dom, gradnju i vrt",
  description,
  "/kategorije",
);

export default function CategoriesPage() {
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Kategorije za sve vaše planove."
        description={description}
        eyebrow="ISTRAŽITE PENNYPLUS PONUDU"
        path="/kategorije"
      />
      <div className="container page-section">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            "@id": `${absoluteUrl("/kategorije")}#kategorije`,
            name: "PennyPlus kategorije na PennyShopu",
            itemListElement: categories.map((category, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: category.name,
              url: category.href,
            })),
          }}
        />
        <CategoryExplorer initialExpanded />
        <div className="editorial-note">
          <h2>Od ideje do pravog izbora.</h2>
          <p>
            Ovdje istražujete oblasti naše ponude. Za artikle, cijene, dostupnost i online kupovinu
            otvorite željenu kategoriju na PennyShopu. Pomoću filtera izdvojite kategorije za dom,
            gradnju, vrt ili svakodnevne potrebe.
          </p>
        </div>
      </div>
    </main>
  );
}
