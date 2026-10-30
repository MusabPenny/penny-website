import "server-only";
import { createAdminClient } from "./supabase/admin";
import { MailError, sendMicrosoftMail } from "./microsoft-mail";

export type MailSettings = {
  enabled: boolean;
  sender: string;
  recipients: string[];
  candidate_confirmation: boolean;
};
export type MailQueueItem = {
  id: string;
  application_id: string;
  audience: "hr" | "candidate";
  status: string;
  attempts: number;
  updated_at: string;
  next_attempt_at?: string;
};
export type MailWorkspace = { settings: MailSettings; queue: MailQueueItem[] };

export async function dispatchRecruitmentMail(id: string) {
  const client = createAdminClient();
  const { data: settings, error: settingsError } = await client
    .from("recruitment_mail_settings")
    .select("*")
    .eq("singleton", true)
    .single();
  if (settingsError || !settings?.enabled) return;
  const { data: item } = await client
    .from("recruitment_mail_queue")
    .select("*")
    .eq("id", id)
    .in("status", ["pending", "failed"])
    .lt("attempts", 5)
    .maybeSingle();
  if (!item || (item.audience === "candidate" && !settings.candidate_confirmation)) return;
  const { data: claimed, error } = await client
    .from("recruitment_mail_queue")
    .update({
      status: "processing",
      attempts: item.attempts + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["pending", "failed"])
    .eq("attempts", item.attempts)
    .select("id")
    .maybeSingle();
  if (error || !claimed) return;
  let status = "failed";
  try {
    const { data: application, error: applicationError } = await client
      .from("candidate_applications")
      .select("id,email")
      .eq("id", item.application_id)
      .single();
    if (applicationError || !application) throw new Error("Application");
    const origin = new URL(process.env.SITE_URL || "https://www.pennyplus.com");
    const hr = item.audience === "hr";
    await sendMicrosoftMail(
      settings.sender,
      hr ? settings.recipients : [application.email],
      hr ? "PennyPlus: nova prijava kandidata" : "PennyPlus: potvrda prijema prijave",
      hr
        ? `Zaprimljena je nova prijava. Pregledajte je u admin panelu:\n${origin.origin}/admin/prijave/${application.id}\n\nPrilozi i lični podaci dostupni su samo ovlaštenim osobama u panelu.`
        : `Hvala na prijavi za posao ili praksu u PennyPlusu. Vaša prijava je zaprimljena.\n\nOznaka prijave: ${application.id}\nSačuvajte ovu oznaku za buduće upite. Ova poruka potvrđuje prijem, a ne izbor kandidata.\n\nKontakt: info@pennyplus.com`,
    );
    status = "accepted";
  } catch (error) {
    status = error instanceof MailError ? error.outcome : "failed";
  }
  const { error: saved } = await client
    .from("recruitment_mail_queue")
    .update({
      status,
      updated_at: new Date().toISOString(),
      next_attempt_at: new Date(
        Date.now() + Math.min(60, 2 ** (item.attempts + 1)) * 60_000,
      ).toISOString(),
    })
    .eq("id", id)
    .eq("status", "processing");
  if (saved) console.error("Status obavijesti nije sačuvan; provjerite red u admin panelu.");
}

export async function processMailQueue() {
  const client = createAdminClient();
  const { data: settings, error: settingsError } = await client
    .from("recruitment_mail_settings")
    .select("enabled")
    .eq("singleton", true)
    .single();
  if (settingsError) throw new Error("Postavke reda nisu dostupne.");
  if (!settings.enabled) return { paused: true, attempted: 0 };
  const { error: staleError } = await client
    .from("recruitment_mail_queue")
    .update({ status: "uncertain", updated_at: new Date().toISOString() })
    .eq("status", "processing")
    .lt("updated_at", new Date(Date.now() - 15 * 60_000).toISOString());
  if (staleError) throw new Error("Red nije dostupan.");
  const { data, error } = await client
    .from("recruitment_mail_queue")
    .select("id")
    .in("status", ["pending", "failed"])
    .lt("attempts", 5)
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at")
    .limit(5);
  if (error) throw new Error("Red nije dostupan.");
  await Promise.all((data ?? []).map((item) => dispatchRecruitmentMail(item.id)));
  return { paused: false, attempted: data?.length ?? 0 };
}

export async function notifyApplication(applicationId: string) {
  try {
    const { data, error } = await createAdminClient()
      .from("recruitment_mail_queue")
      .select("id")
      .eq("application_id", applicationId)
      .eq("status", "pending");
    if (error) return;
    await Promise.all((data ?? []).map((item) => dispatchRecruitmentMail(item.id)));
  } catch {
    console.error("Obavijesti nisu obrađene; prijava ostaje sačuvana.");
  }
}
