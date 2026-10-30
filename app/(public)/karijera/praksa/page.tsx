import { PageIntro } from "@/components/seo";
import { ApplicationForm } from "@/components/application-form";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Prijava za stručnu praksu",
  "Pošaljite prijavu za stručnu praksu u PennyPlusu. Predstavite svoje školovanje, interesovanja i željenu poslovnicu.",
  "/karijera/praksa",
);
export default function Internship() {
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Prvi koraci u svijetu rada."
        description="Prijavite se za stručnu praksu u PennyPlusu. Podijelite s nama šta učite i gdje želite razvijati svoje vještine."
        eyebrow="STRUČNA PRAKSA"
        path="/karijera/praksa"
      />
      <div className="container page-section">
        <ApplicationForm kind="internship" />
      </div>
    </main>
  );
}
