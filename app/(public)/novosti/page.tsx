import { ContentLanding } from "@/components/content-landing";
import { pageMetadata } from "@/lib/seo";
export const revalidate = 60;
const description =
  "Novosti PennyPlusa: objave o kompaniji, saradnjama, događajima i korisnim informacijama za naše kupce.";
export const metadata = pageMetadata("Novosti iz PennyPlusa", description, "/novosti");
export default async function Page() {
  return (
    <ContentLanding
      kind="news"
      title="Novosti iz našeg svijeta."
      description={description}
      path="/novosti"
      empty="Trenutno nema objavljenih novosti."
      basePath="/novosti"
    />
  );
}
