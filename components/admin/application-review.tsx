"use client";
import { useActionState } from "react";
import { processApplication } from "@/app/admin/content-actions";
import { applicationStatuses, type Application } from "@/lib/cms-types";
export function ApplicationReview({ entry }: { entry: Application }) {
  const [state, action, pending] = useActionState(processApplication, { ok: false, message: "" });
  return (
    <form action={action} className="managed-form">
      <input type="hidden" name="id" value={entry.id} />
      <label>
        Status
        <select name="status" defaultValue={entry.status}>
          {Object.entries(applicationStatuses).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        Interna bilješka
        <textarea name="notes" rows={5} maxLength={10000} defaultValue={entry.notes} />
      </label>
      {state.message && <p role="status">{state.message}</p>}
      <button className="admin-button" disabled={pending}>
        {pending ? "Spremanje…" : "Sačuvaj obradu"}
      </button>
    </form>
  );
}
