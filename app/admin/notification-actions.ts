"use server";
import { requireApiPermission } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkedUuid } from "@/lib/admin/policy";
import { dispatchRecruitmentMail, processMailQueue } from "@/lib/recruitment-mail";
import { microsoftMailConfigured } from "@/lib/microsoft-mail";
import { revalidatePath } from "next/cache";

export async function saveMailSettings(_state: { message: string }, data: FormData) {
  const user = await requireApiPermission("applications.manage");
  const enabled = data.get("enabled") === "yes";
  if (enabled && !microsoftMailConfigured())
    return {
      message: "Prvo povežite Microsoft 365 na serveru. Postavke slanja još nisu aktivirane.",
    };
  const recipients = [
    ...new Set(
      String(data.get("recipients") ?? "")
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((s) => s.toLowerCase()),
    ),
  ];
  const { error } = await createAdminClient().rpc("penny_recruitment_mail", {
    p_tenant_id: user.tenant_id,
    p_object_id: user.object_id,
    p_action: "save",
    p_payload: {
      enabled,
      sender: String(data.get("sender") ?? "").trim(),
      recipients,
      candidate_confirmation: data.get("candidate_confirmation") === "yes",
    },
  });
  if (error)
    return {
      message:
        "Postavke nisu sačuvane. Provjerite adrese (najviše 20 primalaca) i dostupnost baze.",
    };
  revalidatePath("/admin/obavijesti");
  return { message: "Postavke obavijesti su sačuvane." };
}
export async function retryMail(data: FormData) {
  const user = await requireApiPermission("applications.manage");
  const id = checkedUuid(String(data.get("id")));
  const { error } = await createAdminClient().rpc("penny_recruitment_mail", {
    p_tenant_id: user.tenant_id,
    p_object_id: user.object_id,
    p_action: "retry",
    p_payload: { id },
  });
  if (error) throw new Error("Obavijest nije dostupna za ponovni pokušaj.");
  await dispatchRecruitmentMail(id);
  revalidatePath("/admin/obavijesti");
}
export async function runMailQueue() {
  await requireApiPermission("applications.manage");
  await processMailQueue();
  revalidatePath("/admin/obavijesti");
}
