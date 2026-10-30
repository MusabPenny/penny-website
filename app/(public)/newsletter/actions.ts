"use server";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiPermission } from "@/lib/admin/access";
import { checkedUuid } from "@/lib/admin/policy";
import { revalidatePath } from "next/cache";
export async function subscribe(
  _state: { ok: boolean; message: string; url: string },
  data: FormData,
) {
  try {
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (
      data.get("website") ||
      data.get("consent") !== "yes" ||
      email.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
      return { ok: false, message: "Unesite ispravan e-mail i potvrdite prijavu.", url: "" };
    if (!process.env.AUTH_SECRET) throw new Error("Configuration");
    const client = createAdminClient();
    const { error: limit } = await client.rpc("penny_form_reserve", {
      p_key: createHmac("sha256", process.env.AUTH_SECRET)
        .update(`newsletter:${email}`)
        .digest("hex"),
    });
    if (limit) throw new Error("Limit");
    const { data: result, error } = await client.rpc("penny_newsletter", {
      p_action: "subscribe",
      p_payload: { email },
    });
    if (error) throw new Error("Subscribe");
    return {
      ok: true,
      message: "Prijava je sačuvana. Sačuvajte poveznicu za odjavu.",
      url: `/newsletter/odjava?token=${result.token}`,
    };
  } catch {
    return { ok: false, message: "Prijava nije sačuvana. Pokušajte kasnije.", url: "" };
  }
}
export async function unsubscribe(_state: { ok: boolean; message: string }, data: FormData) {
  try {
    const token = checkedUuid(String(data.get("token")));
    const { error } = await createAdminClient().rpc("penny_newsletter", {
      p_action: "unsubscribe",
      p_payload: { token },
    });
    if (error) throw error;
    return { ok: true, message: "Odjava je evidentirana." };
  } catch {
    return { ok: false, message: "Odjava nije uspjela. Kontaktirajte info@pennyplus.com." };
  }
}
export async function deleteSubscriber(data: FormData) {
  const user = await requireApiPermission("content.manage");
  const { error } = await createAdminClient().rpc("penny_newsletter", {
    p_action: "delete",
    p_payload: { id: checkedUuid(String(data.get("id"))) },
    p_tenant_id: user.tenant_id,
    p_object_id: user.object_id,
  });
  if (error) throw new Error("Brisanje nije uspjelo.");
  revalidatePath("/admin/newsletter");
}
