"use client";
import { useActionState } from "react";
import { saveMailSettings } from "@/app/admin/notification-actions";
import type { MailSettings } from "@/lib/recruitment-mail";
export function MailSettingsForm({
  settings,
  configured,
}: {
  settings: MailSettings;
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(saveMailSettings, { message: "" });
  return (
    <form action={action} className="managed-form">
      <label>
        Microsoft 365 adresa pošiljaoca
        <input
          type="email"
          name="sender"
          defaultValue={settings.sender}
          placeholder="posao@vasa-domena.ba"
          maxLength={320}
        />
        <small>Poslovni mailbox kojem je aplikaciji odobreno slanje.</small>
      </label>
      <label>
        HR primaoci
        <textarea
          name="recipients"
          rows={5}
          defaultValue={settings.recipients.join("\n")}
          placeholder="Jedna e-mail adresa po redu"
        />
        <small>
          Najviše 20 adresa. Primaoci dobijaju poveznicu na prijavu; pristup panelu dodjeljuje se
          zasebno.
        </small>
      </label>
      <label className="form-check">
        <input
          type="checkbox"
          name="candidate_confirmation"
          value="yes"
          defaultChecked={settings.candidate_confirmation}
        />
        Pošalji kandidatu potvrdu prijema
      </label>
      <label className="form-check">
        <input
          type="checkbox"
          name="enabled"
          value="yes"
          defaultChecked={settings.enabled}
          disabled={!configured}
        />
        Uključi obavijesti za nove prijave za posao i praksu
      </label>
      {state.message && <p role="status">{state.message}</p>}
      <button className="admin-button" disabled={pending}>
        {pending ? "Spremanje…" : "Sačuvaj postavke"}
      </button>
    </form>
  );
}
