"use client";
import { useActionState, useState, type ChangeEvent } from "react";
import { saveContent, type CmsState } from "@/app/admin/content-actions";
import type { ContentKind, Entry } from "@/lib/cms-types";
import { uploadWithTicket } from "@/lib/browser-upload";
import { pickerDateTime } from "@/lib/admin/date-time";
export function ContentForm({ kind, entry }: { kind: ContentKind; entry?: Entry }) {
  const [values, setValues] = useState<Record<string, string>>({
    title: entry?.title ?? "",
    slug: entry?.slug ?? "",
    summary: entry?.summary ?? "",
    body: entry?.body ?? "",
    location: entry?.location ?? "",
    status: entry?.status ?? "DRAFT",
    starts_at: pickerDateTime(entry?.starts_at ?? new Date().toISOString()),
    ends_at: entry?.ends_at ? pickerDateTime(entry.ends_at) : "",
    source_url: entry?.source_url ?? "",
  });
  const bind = (name: string) => ({
    value: values[name] ?? "",
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((previous) => ({ ...previous, [name]: event.target.value })),
  });
  const [state, action, pending] = useActionState(
    async (previous: CmsState, data: FormData): Promise<CmsState> => {
      try {
        const file = data.get("asset");
        if (file instanceof File && file.size) {
          if (file.size > 10 * 1024 * 1024) throw new Error("Fajl smije imati najviše 10 MB.");
          const r = await fetch("/api/admin/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, name: file.name, size: file.size }),
          });
          const ticket = await r.json();
          if (!r.ok) throw new Error(ticket.error);
          await uploadWithTicket(file, ticket);
          data.delete("asset");
          data.set("asset_receipt", ticket.receipt);
        }
        return { ...previous, ...(await saveContent(previous, data)) };
      } catch (error) {
        return {
          ...previous,
          ok: false,
          message: error instanceof Error ? error.message : "Upload nije uspio.",
        };
      }
    },
    { ok: false, message: "" },
  );
  return (
    <form action={action} className="managed-form">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={state.id ?? entry?.id ?? ""} />
      <input type="hidden" name="version" value={state.version ?? entry?.updated_at ?? ""} />
      <label>
        Naslov
        <input name="title" required minLength={3} maxLength={200} {...bind("title")} />
      </label>
      <label>
        URL oznaka
        <input
          name="slug"
          required
          pattern="[a-z0-9][a-z0-9-]{0,149}"
          {...bind("slug")}
          placeholder="naziv-objave"
        />
      </label>
      <label>
        Kratki opis
        <textarea name="summary" rows={3} maxLength={1000} {...bind("summary")} />
      </label>
      <label>
        Tekst objave
        <textarea name="body" rows={12} maxLength={50000} {...bind("body")} />
        <small>Odlomke odvojite praznim redom.</small>
      </label>
      {kind === "job" && (
        <label>
          Lokacija rada
          <input name="location" maxLength={200} {...bind("location")} />
        </label>
      )}
      <label>
        Status
        <select name="status" {...bind("status")}>
          <option value="DRAFT">Nacrt</option>
          <option value="PUBLISHED">Objavljeno</option>
          <option value="ARCHIVED">Arhivirano</option>
        </select>
      </label>
      <label>
        Datum i vrijeme objave
        <input type="datetime-local" name="starts_at" required {...bind("starts_at")} />
        <small>Lokalno vrijeme Sarajeva. Odaberite datum i vrijeme u kalendaru.</small>
      </label>
      <label>
        {kind === "job" ? "Rok za prijave" : "Datum i vrijeme isteka (opcionalno)"}
        <input
          type="datetime-local"
          name="ends_at"
          required={kind === "job" && values.status === "PUBLISHED"}
          min={values.starts_at}
          {...bind("ends_at")}
        />
        <small>Nakon isteka oglas ili ponuda više nisu javno dostupni.</small>
      </label>
      <label>
        {kind === "catalog" || kind === "document" ? "PDF dokument" : "Fotografija ili prilog"}
        <input
          type="file"
          name="asset"
          accept={
            kind === "catalog" || kind === "document"
              ? "application/pdf"
              : ".pdf,.jpg,.jpeg,.png,.webp"
          }
        />
        <small>
          Najviše 10 MB.{" "}
          {entry?.asset_name &&
            `Postojeći fajl: ${entry.asset_name}. Novi upload zamjenjuje prilog.`}
        </small>
      </label>
      <label>
        Izvor / web stranica (opcionalno)
        <input name="source_url" type="url" {...bind("source_url")} />
      </label>
      {state.message && (
        <p role="status" className={state.ok ? "form-success" : "form-error"}>
          {state.message}
        </p>
      )}
      <button className="admin-button" disabled={pending}>
        {pending ? "Spremanje…" : "Sačuvaj"}
      </button>
    </form>
  );
}
