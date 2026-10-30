import { ContentLanding } from "@/components/content-landing";
import { pageMetadata } from "@/lib/seo";
export const revalidate = 60;
const description =
  "Pregledajte objavljene PennyPlus i Penny market kataloge. Otvorite PDF ponudu i provjerite navedeni period važenja.";
export const metadata = pageMetadata(
  "Katalozi PennyPlus i Penny marketi",
  description,
  "/katalozi",
);
export default async function Page() {
  return (
    <ContentLanding
      kind="catalog"
      title="Ponuda koju možete prelistati."
      description={description}
      path="/katalozi"
      empty="Trenutno nema objavljenih kataloga. Za informacije o ponudi kontaktirajte naš tim."
    />
  );
}
