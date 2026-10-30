"use server";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationBucket, type Attachment } from "@/lib/cms-types";
import { validateApplication } from "@/lib/application-fields";
import { checkedUpload } from "@/lib/uploads";
import { checkedUuid } from "@/lib/admin/policy";
import { readReceipt } from "@/lib/upload-receipt";
import { after } from "next/server";
import { notifyApplication } from "@/lib/recruitment-mail";
export type ApplicationState = { ok: boolean; message: string };
export async function submitApplication(
  _state: ApplicationState,
  data: FormData,
): Promise<ApplicationState> {
  const uploaded: string[] = [];
  const client = createAdminClient();
  let mayHaveCommitted = false;
  try {
    if (data.get("website")) throw new Error("Prijava nije poslana.");
    const kind = data.get("kind");
    if (kind !== "job" && kind !== "internship") throw new Error("Provjerite vrstu prijave.");
    const answers = validateApplication(data, kind);
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("CONFIGURATION");
    const receiptValue = String(data.get("upload_receipt") ?? "");
    const receipt = receiptValue
      ? readReceipt<{
          id: string;
          hash: string;
          files: { path: string; name: string; size: number; slot: string }[];
        }>(receiptValue)
      : null;
    const key = createHmac("sha256", secret).update(answers.email.toLowerCase()).digest("hex");
    const limit = receipt
      ? { error: null }
      : await client.rpc("penny_form_reserve", { p_key: key });
    if (limit.error)
      throw new Error(
        limit.error.message === "RATE_LIMIT"
          ? "Previše pokušaja. Pokušajte ponovo za sat vremena."
          : "Prijava trenutno nije dostupna.",
      );
    const id = receipt ? checkedUuid(receipt.id) : randomUUID();
    const files: Attachment[] = [];
    if (receipt) {
      const hash = createHash("sha256")
        .update(JSON.stringify({ answers, kind, job_id: data.get("job_id") ?? "" }))
        .digest("hex");
      if (hash !== receipt.hash) throw new Error("Provjerite prijavu i ponovite upload priloga.");
      const existing = await client
        .from("candidate_applications")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (existing.error) throw new Error("Prijava trenutno nije dostupna.");
      if (existing.data) return { ok: true, message: `Prijava je već zaprimljena. Oznaka: ${id}.` };
      for (const attachment of receipt.files) {
        if (!attachment.path.startsWith(`${id}/`)) throw new Error("Provjerite priloge.");
        const download = await client.storage.from(applicationBucket).download(attachment.path);
        if (download.error || !download.data || download.data.size !== attachment.size)
          throw new Error("Prilog nije dostupan. Odaberite fajlove ponovo.");
        const verified = await checkedUpload(new File([download.data], attachment.name), true);
        uploaded.push(attachment.path);
        files.push({ ...attachment, name: verified.name, mime: verified.mime });
      }
    }
    const slots = kind === "job" ? ["cv"] : ["cv", "motivation_file", "other_file"];
    for (const slot of slots) {
      const file = data.get(slot);
      if (!(file instanceof File) || !file.size) continue;
      const upload = await checkedUpload(file, true);
      const path = `${id}/${slot}.${upload.ext}`;
      const result = await client.storage
        .from(applicationBucket)
        .upload(path, upload.bytes, { contentType: upload.mime, upsert: false });
      if (result.error) throw new Error("Prilog nije sačuvan. Pokušajte ponovo.");
      uploaded.push(path);
      files.push({ path, name: upload.name, mime: upload.mime, size: file.size, slot });
    }
    const rawJob = String(data.get("job_id") ?? "");
    mayHaveCommitted = true;
    const result = await client.rpc("penny_submit_application", {
      p_payload: {
        id,
        kind,
        job_id: kind === "job" && rawJob ? checkedUuid(rawJob) : null,
        first_name: answers.first_name,
        last_name: answers.last_name,
        email: answers.email.toLowerCase(),
        answers,
        attachments: files,
      },
    });
    if (result.error) {
      if (["JOB_CLOSED", "INVALID_INPUT"].includes(result.error.message)) mayHaveCommitted = false;
      throw new Error(
        result.error.message === "JOB_CLOSED"
          ? "Oglas je zatvoren. Odaberite drugi oglas ili otvorenu prijavu."
          : "Prijava nije sačuvana. Pokušajte ponovo.",
      );
    }
    after(() => notifyApplication(id));
    return {
      ok: true,
      message: `Prijava je uspješno zaprimljena. Vaša oznaka prijave je ${id}. Sačuvajte je za buduće upite.`,
    };
  } catch (error) {
    if (uploaded.length && !mayHaveCommitted)
      await client.storage.from(applicationBucket).remove(uploaded);
    const msg = error instanceof Error ? error.message : "";
    return {
      ok: false,
      message:
        /^(Provjerite|Potvrdite|Potrebna|Dopunite|Previše|Oglas|Prijava|Prilog|Fajl|Nepodržan|Sadržaj)/.test(
          msg,
        )
          ? msg
          : "Prijava nije poslana. Pokušajte ponovo kasnije.",
    };
  }
}
