"use client";
import { useActionState } from "react";
import { saveDirectory } from "@/app/admin/directory-actions";
import type { DirectoryRecord } from "@/lib/directory-types";
export function DirectoryForm({
  kind,
  entry,
}: {
  kind: "location" | "member";
  entry?: DirectoryRecord;
}) {
  const [state, action, pending] = useActionState(saveDirectory, { message: "" });
  const data = (entry?.data ?? {}) as unknown as Record<string, unknown>;
  const field = (key: string, label: string, required = true, type = "text") => (
    <label key={key}>
      {label}
      <input
        name={key}
        type={type}
        defaultValue={String(data[key] ?? "")}
        required={required}
        maxLength={key === "hours" ? 500 : 200}
      />
    </label>
  );
  return (
    <form action={action} className="managed-form">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="version" value={state.version ?? entry?.updated_at ?? ""} />
      <label>
        Stalna URL oznaka
        <input
          name="id"
          defaultValue={entry?.id}
          readOnly={Boolean(entry)}
          required
          pattern="[a-z0-9][a-z0-9-]{0,149}"
        />
        <small>Postojeća oznaka ostaje ista radi očuvanja poveznica.</small>
      </label>
      {field("name", kind === "member" ? "Ime i prezime" : "Naziv lokacije")}
      {kind === "location" ? (
        <>
          {field("title", "Puni naziv objekta")}
          <label>
            Tip objekta
            <select name="type" defaultValue={String(data.type ?? "PennyPlus")}>
              {["PennyPlus", "Penny marketi", "Rezni centar", "Toys&Fun igraonice"].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          {field("address", "Adresa")}
          {field("city", "Grad / naselje")}
          {field("hours", "Radno vrijeme")}
          {field("phone", "Telefon")}
          {field("email", "E-mail", true, "email")}
          <label>
            Usluge
            <input
              name="services"
              defaultValue={((data.services as string[]) ?? []).join(", ")}
              maxLength={1000}
            />
            <small>Odvojite usluge zarezom.</small>
          </label>
        </>
      ) : (
        <>
          {field("role", "Funkcija")}
          {field("departmentId", "Oznaka službe")}
          {field("departmentName", "Naziv službe")}
          {field("phone", "Telefon", false)}
          <label>
            E-mail adrese
            <textarea
              name="emails"
              defaultValue={((data.emails as string[]) ?? []).join("\n")}
              maxLength={1500}
            />
          </label>
          <label>
            Fotografija iz Storagea
            <input
              name="image"
              type="url"
              defaultValue={
                String((data.image as { src?: string })?.src ?? "").startsWith("https://")
                  ? (data.image as { src: string }).src
                  : ""
              }
            />
            <small>Javna Storage adresa iz ovog projekta. Prazno polje koristi Penny logo.</small>
          </label>
          <label>
            Nova fotografija
            <input type="file" name="photo" accept=".jpg,.jpeg,.png,.webp" />
            <small>Najviše 3 MB. Fotografija se čuva u Storageu i zamjenjuje unesenu adresu.</small>
          </label>
        </>
      )}
      <label>
        Redoslijed
        <input
          name="position"
          type="number"
          defaultValue={entry?.position ?? 0}
          min={0}
          max={100000}
        />
      </label>
      <label className="form-check">
        <input
          name="published"
          type="checkbox"
          value="yes"
          defaultChecked={entry?.published ?? true}
        />
        Prikaži na javnoj stranici
      </label>
      {state.message && <p role="status">{state.message}</p>}
      <button className="admin-button" disabled={pending}>
        {pending ? "Spremanje…" : "Sačuvaj"}
      </button>
    </form>
  );
}
