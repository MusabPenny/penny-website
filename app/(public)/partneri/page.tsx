import { ContentLanding } from "@/components/content-landing";
import { pageMetadata } from "@/lib/seo";
export const revalidate = 60;
const description =
  "Upoznajte brendove i partnere iz PennyPlus ponude. Istražite njihov asortiman za dom, gradnju i svakodnevicu na PennyShopu.";
export const metadata = pageMetadata("Naši partneri i brendovi", description, "/partneri");
export default async function Page() {
  return (
    <ContentLanding
      kind="partner"
      title="Zajedno gradimo dobar izbor."
      description={description}
      path="/partneri"
      empty="Za informacije o našim brendovima i saradnji kontaktirajte prodajni tim."
    />
  );
}
