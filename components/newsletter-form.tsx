"use client";
import Link from "next/link";
import { useActionState } from "react";
import { subscribe, unsubscribe } from "@/app/(public)/newsletter/actions";
export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribe, { ok: false, message: "", url: "" });
  return (
    <form action={action} className="managed-form">
      <label>
        E-mail adresa
        <input type="email" name="email" required maxLength={320} />
      </label>
      <div className="form-honeypot" aria-hidden="true">
        <input name="website" tabIndex={-1} aria-label="Website" />
      </div>
      <label className="form-check">
        <input type="checkbox" name="consent" value="yes" required />
        <span>
          Želim primati PennyPlus novosti i ponude. Pročitao/la sam{" "}
          <Link href="/privatnost">informacije o privatnosti</Link>.
        </span>
      </label>
      <button className="button button-red" disabled={pending}>
        Prijavi se na newsletter
      </button>
      {state.message && <p role="status">{state.message}</p>}
      {state.url && <Link href={state.url}>Moja poveznica za odjavu</Link>}
    </form>
  );
}
export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(unsubscribe, { ok: false, message: "" });
  return (
    <form action={action} className="managed-form">
      <input type="hidden" name="token" value={token} />
      <button className="button button-red" disabled={pending || state.ok}>
        Potvrdi odjavu
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
