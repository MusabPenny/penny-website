"use client";

import { useActionState, useState, type ReactNode } from "react";
import { mutateAdmin } from "@/app/admin/actions";

export function MutationForm({
  action,
  targetId,
  roleId,
  label,
  children,
}: {
  action: string;
  targetId: string;
  roleId?: string;
  label: string;
  children?: ReactNode;
}) {
  const [state, submit, pending] = useActionState(mutateAdmin, { ok: false, message: "" });
  const [confirming, setConfirming] = useState(false);
  return (
    <form action={submit} className="admin-mutation">
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="targetId" value={targetId} />
      {roleId && <input type="hidden" name="roleId" value={roleId} />}
      {children}
      {confirming ? (
        <div className="admin-confirm">
          <p>Potvrđujete radnju „{label}“?</p>
          <button
            type="submit"
            name="confirmed"
            value="yes"
            disabled={pending}
            className="admin-button"
          >
            {pending ? "Čuvanje…" : "Potvrdi"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="admin-button secondary"
          >
            Odustani
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="admin-button secondary"
        >
          {label}
        </button>
      )}
      {state.message && (
        <p role="status" className={state.ok ? "admin-success" : "admin-error-message"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
