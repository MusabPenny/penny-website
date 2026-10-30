import { PageIntro } from "@/components/seo";
import { UnsubscribeForm } from "@/components/newsletter-form";
export const metadata = {
  title: "Odjava s newslettera | PennyPlus",
  robots: { index: false, follow: false },
};
export default async function Unsubscribe({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Odjava s newslettera"
        description="Potvrdite da više ne želite primati PennyPlus novosti i ponude."
        eyebrow="NEWSLETTER"
        path="/newsletter/odjava"
      />
      <div className="container page-section">
        <UnsubscribeForm token={token ?? ""} />
      </div>
    </main>
  );
}
