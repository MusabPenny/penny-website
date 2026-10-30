"use client";
import Link from "next/link";
import { useActionState, useState, type ChangeEvent } from "react";
import { submitApplication } from "@/app/(public)/karijera/actions";
import { jobSections, internshipSections } from "@/lib/application-fields";
import { uploadWithTicket } from "@/lib/browser-upload";
export function ApplicationForm({
  kind,
  jobs = [],
  selectedJob = "",
}: {
  kind: "job" | "internship";
  jobs?: { id: string; title: string }[];
  selectedJob?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({ job_id: selectedJob });
  const bind = (name: string) => ({
    value: values[name] ?? "",
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((previous) => ({ ...previous, [name]: event.target.value })),
  });
  const [state, action, pending] = useActionState(
    async (previous: { ok: boolean; message: string }, data: FormData) => {
      try {
        const fields = Object.fromEntries([...data].filter(([, v]) => typeof v === "string"));
        const files = [...data].filter(
          (entry): entry is [string, File] => entry[1] instanceof File && entry[1].size > 0,
        );
        {
          if (files.some(([, f]) => f.size > 3 * 1024 * 1024))
            throw new Error("Svaki prilog smije imati najviše 3 MB.");
          const r = await fetch("/api/prijave/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind,
              fields,
              files: files.map(([slot, f]) => ({ slot, name: f.name, size: f.size })),
            }),
          });
          const ticket = await r.json();
          if (!r.ok) throw new Error(ticket.error);
          for (const [slot, f] of files) {
            await uploadWithTicket(
              f,
              ticket.files.find((t: { slot: string }) => t.slot === slot),
            );
            data.delete(slot);
          }
          data.set("upload_receipt", ticket.receipt);
        }
        return await submitApplication(previous, data);
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Prijava nije poslana.",
        };
      }
    },
    { ok: false, message: "" },
  );
  if (state.ok)
    return (
      <div className="form-success" role="status">
        <h2>Hvala na prijavi.</h2>
        <p>{state.message}</p>
        <Link href="/karijera">Nazad na karijeru →</Link>
      </div>
    );
  return (
    <form action={action} className="managed-form application-form">
      <input type="hidden" name="kind" value={kind} />
      <div className="form-honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p>Polja označena zvjezdicom (*) su obavezna. Podatke koristimo za obradu vaše prijave.</p>
      {kind === "job" && (
        <label>
          Radno mjesto *
          <select name="job_id" {...bind("job_id")}>
            <option value="">Otvorena prijava — bez određenog oglasa</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {(kind === "job" ? jobSections : internshipSections).map((section) => (
        <fieldset key={section.title}>
          <legend>{section.title}</legend>
          <div className="form-grid">
            {section.fields.map((field) => (
              <label key={field.name}>
                {field.label}
                {field.required ? " *" : ""}
                {field.options ? (
                  <select name={field.name} required={field.required} {...bind(field.name)}>
                    <option value="" disabled>
                      Odaberite
                    </option>
                    {field.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    {...bind(field.name)}
                    rows={5}
                    maxLength={4000}
                    required={field.required}
                  />
                ) : (
                  <input
                    name={field.name}
                    {...bind(field.name)}
                    type={field.type ?? "text"}
                    required={field.required}
                    min={field.min}
                    max={field.type === "date" ? new Date().toISOString().slice(0, 10) : field.max}
                    maxLength={320}
                  />
                )}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset>
        <legend>Prilozi</legend>
        <p>
          PDF, DOC ili DOCX; najviše 3 MB po fajlu. Prilozi su dostupni samo ovlaštenim osobama koje
          obrađuju prijave.
        </p>
        <label>
          Biografija (CV)
          <input type="file" name="cv" accept=".pdf,.doc,.docx" />
        </label>
        {kind === "internship" && (
          <>
            <label>
              Motivacijsko pismo
              <input type="file" name="motivation_file" accept=".pdf,.doc,.docx" />
            </label>
            <label>
              Ostala dokumentacija
              <input type="file" name="other_file" accept=".pdf,.doc,.docx" />
            </label>
          </>
        )}
      </fieldset>
      <label className="form-check">
        <input type="checkbox" name="consent" value="yes" required />
        <span>
          Pročitao/la sam <Link href="/privatnost">informacije o obradi ličnih podataka</Link> i
          potvrđujem tačnost prijave. *
        </span>
      </label>
      {kind === "internship" && (
        <label className="form-check">
          <input type="checkbox" name="guardian_consent" value="yes" required />
          <span>
            Roditelj / staratelj je upoznat s prijavom i saglasan s dostavljanjem navedenih
            podataka. *
          </span>
        </label>
      )}
      {state.message && (
        <p role="alert" className="form-error">
          {state.message} Ako ste dodali priloge, prije ponovnog slanja ponovo ih odaberite.
        </p>
      )}
      <button className="button button-red" disabled={pending}>
        {pending ? "Slanje prijave…" : "Pošalji prijavu"}
      </button>
    </form>
  );
}
