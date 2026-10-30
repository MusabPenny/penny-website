import { ContentLanding } from "@/components/content-landing";
import { pageMetadata } from "@/lib/seo";
export const revalidate = 60;
const description =
  "Preuzmite javne dokumente kompanije Penny plus d.o.o. Sarajevo: poreznu registraciju, PDV uvjerenje i potvrde o upravljanju otpadom.";
export const metadata = pageMetadata("Dokumenti kompanije", description, "/dokumenti");
export default async function Page() {
  return (
    <ContentLanding
      kind="document"
      title="Dokumenti na jednom mjestu."
      description={description}
      path="/dokumenti"
      empty="Trenutno nema javnih dokumenata. Zatražite dokumentaciju od našeg tima."
    />
  );
}
