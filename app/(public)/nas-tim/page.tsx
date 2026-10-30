import { PageIntro, JsonLd } from "@/components/seo";
import { TeamDirectory } from "@/components/team-directory";
import { ContactCta } from "@/components/content-sections";
import { publishedTeam } from "@/lib/directory";
import { absoluteUrl, organizationId, pageMetadata } from "@/lib/seo";
import "./team.css";

const description =
  "Upoznajte ljude koji čine PennyPlus. Pronađite članove našeg tima, njihove funkcije i kontakte po službama, od uprave do prodaje i podrške.";
export const metadata = pageMetadata("Naš tim - ljudi i kontakti", description, "/nas-tim");

export const revalidate = 60;
export default async function TeamPage() {
  const teamDepartments = await publishedTeam();
  const teamMemberCount = teamDepartments.reduce((sum, group) => sum + group.members.length, 0);
  return (
    <main id="sadrzaj">
      <PageIntro
        title="Ljudi iza Penny priče."
        description={description}
        eyebrow="NAŠ TIM"
        path="/nas-tim"
        crumbs={[{ label: "O nama", href: "/o-nama" }]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "PennyPlus - naš tim",
          numberOfItems: teamMemberCount,
          itemListElement: teamDepartments
            .flatMap((group) => group.members)
            .map((member, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "Person",
                name: member.name,
                jobTitle: member.role,
                image: absoluteUrl(member.image.src),
                url: absoluteUrl(`/nas-tim#osoba-${member.id}`),
                worksFor: { "@id": organizationId },
              },
            })),
        }}
      />
      <div className="container page-section">
        <div className="team-welcome">
          <div>
            <span className="eyebrow">ZNANJE. SARADNJA. POVJERENJE.</span>
            <h2>Pravi ljudi za vaše pitanje.</h2>
            <p>Upoznajte naš tim i pronađite kontakt osobe ili službe koja vam je potrebna.</p>
          </div>
          <div className="team-stat">
            <strong>{String(teamDepartments.length).padStart(2, "0")}</strong>
            <span>službi na jednom mjestu</span>
          </div>
        </div>
        <TeamDirectory departments={teamDepartments} />
        <ContactCta />
      </div>
    </main>
  );
}
