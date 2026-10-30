import { PageIntro } from "@/components/seo";
import { LocationDirectory } from "@/components/content-sections";
import { pageMetadata } from "@/lib/seo";

const description =
  "Pronađite PennyPlus prodajne centre, Penny markete, Rezni centar i Toys&Fun igraonice u Sarajevu. Provjerite adrese, radno vrijeme, telefone i upute za dolazak.";
export const metadata = pageMetadata(
  "Prodajni centri i marketi u Sarajevu",
  description,
  "/prodajni-centri",
);

export default function LocationsPage() {
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Uvijek negdje blizu vas."
        description={description}
        eyebrow="PENNYPLUS LOKACIJE"
        path="/prodajni-centri"
      />
      <div className="container page-section">
        <LocationDirectory />
        <p className="data-note">
          Radno vrijeme može se razlikovati tokom praznika. Prije dolaska provjerite eventualne
          izmjene direktno s odabranim centrom.
        </p>
      </div>
    </main>
  );
}
