import { ContentLanding } from "@/components/content-landing";
import { pageMetadata } from "@/lib/seo";
export const revalidate = 60;
const description =
  "Pronađite aktuelne PennyPlus i Penny market akcije i vikend ponude. Provjerite detalje i rokove važenja svake objavljene ponude.";
export const metadata = pageMetadata("Akcije i vikend ponude", description, "/akcije");
export default async function Page() {
  return (
    <ContentLanding
      kind="promotion"
      title="Više prilika za vaše planove."
      description={description}
      path="/akcije"
      empty="Trenutno nema objavljenih akcija. Aktuelnu ponudu provjerite u našim centrima."
      basePath="/akcije"
    />
  );
}
