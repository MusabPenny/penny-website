import { PageIntro } from "@/components/seo";
import { NewsletterForm } from "@/components/newsletter-form";
import { pageMetadata } from "@/lib/seo";
const description =
  "Prijavite se za PennyPlus novosti i ponude. Prijava na newsletter je dobrovoljna i možete se odjaviti kada želite.";
export const metadata = pageMetadata("Newsletter - novosti i ponude", description, "/newsletter");
export default function Newsletter() {
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Ostanimo povezani."
        description={description}
        eyebrow="NEWSLETTER"
        path="/newsletter"
      />
      <div className="container page-section">
        <NewsletterForm />
      </div>
    </main>
  );
}
