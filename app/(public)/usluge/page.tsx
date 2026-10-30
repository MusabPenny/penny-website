import { PageIntro } from "@/components/seo";
import { ServiceCards, ContactCta } from "@/components/content-sections";
import { pageMetadata } from "@/lib/seo";

const description =
  "Upoznajte PennyPlus usluge: dostavu, obradu materijala, toniranje boja, plaćanje, Club kartice, zamjenu robe i podršku za garanciju.";
export const metadata = pageMetadata("Usluge za dom i gradnju", description, "/usluge");

export default function ServicesPage() {
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Vi zamislite. Mi pomažemo."
        description={description}
        eyebrow="PENNYPLUS USLUGE"
        path="/usluge"
      />
      <div className="container page-section">
        <ServiceCards />
        <ContactCta />
      </div>
    </main>
  );
}
