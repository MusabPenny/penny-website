import { requirePermission } from "@/lib/admin/access";
import { contentAdmin } from "@/lib/cms";
import type { Application } from "@/lib/cms-types";
import { jobSections, internshipSections } from "@/lib/application-fields";
import { ApplicationReview } from "@/components/admin/application-review";
import { AdminHeading } from "@/components/admin/ui";
import { checkedUuid } from "@/lib/admin/policy";
import { deleteApplication } from "@/app/admin/content-actions";
export default async function Candidate({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("applications.manage");
  const { id } = await params;
  const entry = await contentAdmin<Application>(user, "application", { id: checkedUuid(id) });
  const fields = (entry.kind === "job" ? jobSections : internshipSections).flatMap((s) => s.fields);
  return (
    <>
      <AdminHeading
        eyebrow={entry.job_title}
        title={`${entry.first_name} ${entry.last_name}`}
        description={`Oznaka prijave: ${entry.id}`}
      />
      <section className="admin-panel">
        <h2>Podaci prijave</h2>
        <dl className="candidate-answers">
          {fields.map((f) => (
            <div key={f.name}>
              <dt>{f.label}</dt>
              <dd>{entry.answers[f.name] || "—"}</dd>
            </div>
          ))}
        </dl>
        <h2>Prilozi</h2>
        {!entry.attachments.length && <p>Nema priloga.</p>}
        {entry.attachments.map((a, i) => (
          <p key={a.path}>
            <a className="text-link" href={`/api/admin/prijave/${id}/prilog?index=${i}`}>
              Preuzmi {a.name}
            </a>
          </p>
        ))}
      </section>
      <section className="admin-panel">
        <h2>Obrada prijave</h2>
        <ApplicationReview entry={entry} />
      </section>
      <section className="admin-panel">
        <h2>Brisanje ličnih podataka</h2>
        <form action={deleteApplication}>
          <input type="hidden" name="id" value={entry.id} />
          <label className="form-check">
            <input type="checkbox" name="confirmed" value="yes" required />
            Potvrđujem trajno brisanje prijave i priloga.
          </label>
          <button className="admin-button secondary">Obriši prijavu i priloge</button>
        </form>
      </section>
    </>
  );
}
