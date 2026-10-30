"use server";
import { revalidatePath, updateTag } from "next/cache";
import { requireApiPermission } from "@/lib/admin/access";
import { contentAdmin } from "@/lib/cms";
import {
  applicationBucket,
  assetBucket,
  contentKinds,
  type Application,
  type Entry,
  type ContentKind,
} from "@/lib/cms-types";
import { checkedUpload } from "@/lib/uploads";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkedUuid } from "@/lib/admin/policy";
import { readReceipt } from "@/lib/upload-receipt";
import { pickerInstant } from "@/lib/admin/date-time";
export type CmsState = { ok: boolean; message: string; id?: string; version?: string };
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
export async function saveContent(_state: CmsState, data: FormData): Promise<CmsState> {
  try {
    const kind = value(data, "kind") as ContentKind;
    if (!contentKinds.includes(kind)) throw new Error("Nepoznat tip sadržaja.");
    const user = await requireApiPermission(kind === "job" ? "jobs.manage" : "content.manage");
    const id = value(data, "id") ? checkedUuid(value(data, "id")) : "";
    const existing = id
      ? (await (await import("@/lib/cms")).contentEntrySnapshot(user, kind, { edit: id }))
          .entries[0]
      : null;
    if (id && !existing) throw new Error("Zapis nije pronađen.");
    const title = value(data, "title"),
      slug = value(data, "slug");
    if (title.length < 3 || title.length > 200 || !/^[a-z0-9][a-z0-9-]{0,149}$/.test(slug))
      throw new Error("Provjerite naslov i URL oznaku (mala slova, brojevi i crtice).");
    const start = pickerInstant(value(data, "starts_at"));
    const end = value(data, "ends_at") ? pickerInstant(value(data, "ends_at")) : null;
    if (kind === "job" && value(data, "status") === "PUBLISHED" && !end)
      throw new Error("Dodajte rok za prijave prije objave oglasa.");
    if (
      !Number.isFinite(start.getTime()) ||
      (end && (!Number.isFinite(end.getTime()) || end <= start))
    )
      throw new Error("Provjerite datume objave i isteka.");
    let asset_path = existing?.asset_path ?? null,
      asset_name = existing?.asset_name ?? null,
      asset_mime = existing?.asset_mime ?? null;
    let file = data.get("asset");
    let stagingPath: string | undefined;
    if (value(data, "asset_receipt")) {
      const receipt = readReceipt<{
        user: string;
        kind: string;
        path: string;
        name: string;
        size: number;
      }>(value(data, "asset_receipt"));
      if (
        receipt.user !== user.id ||
        receipt.kind !== kind ||
        !receipt.path.startsWith(`${user.id}/`)
      )
        throw new Error("Upload token nije ispravan.");
      const download = await createAdminClient()
        .storage.from("upload-staging")
        .download(receipt.path);
      if (download.error || !download.data || download.data.size !== receipt.size)
        throw new Error("Upload nije završen. Pokušajte ponovo.");
      file = new File([download.data], receipt.name);
      stagingPath = receipt.path;
    }
    if (file instanceof File && file.size) {
      const upload = await checkedUpload(file);
      if (["catalog", "document"].includes(kind) && upload.ext !== "pdf")
        throw new Error("Katalozi i dokumenti trebaju biti PDF fajlovi.");
      asset_path = `${kind}/${upload.hash}.${upload.ext}`;
      asset_name = upload.name;
      asset_mime = upload.mime;
      const storage = createAdminClient().storage.from(assetBucket);
      const { error } = await storage.upload(asset_path, upload.bytes, {
        contentType: upload.mime,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error && String(error.statusCode) !== "409") throw new Error("Upload nije uspio.");
    }
    if (["catalog", "document"].includes(kind) && !asset_path) throw new Error("Dodajte PDF fajl.");
    const source = value(data, "source_url");
    if (source && !/^https:\/\//.test(source)) throw new Error("Izvor mora biti HTTPS adresa.");
    const saved = await contentAdmin<Entry>(user, "save", {
      id,
      version: value(data, "version"),
      kind,
      title,
      slug,
      summary: value(data, "summary"),
      body: value(data, "body"),
      status: value(data, "status"),
      starts_at: start.toISOString(),
      ends_at: end?.toISOString() ?? null,
      location: value(data, "location"),
      source_url: source || null,
      asset_path,
      asset_name,
      asset_mime,
    });
    if (stagingPath) await createAdminClient().storage.from("upload-staging").remove([stagingPath]);
    updateTag("site-content");
    revalidatePath("/", "layout");
    return {
      ok: true,
      id: saved.id,
      version: saved.updated_at,
      message: "Sadržaj je sačuvan. Objavljeni sadržaj je dostupan na javnoj stranici.",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    return {
      ok: false,
      message:
        msg === "CONFLICT"
          ? "Zapis je u međuvremenu izmijenjen. Osvježite stranicu prije ponovnog uređivanja."
          : /^(Provjerite|Dodajte|Katalozi|Upload|Sadržaj|Nepodržan|Fajl|Izvor|Zapis)/.test(msg)
            ? msg
            : "Promjena nije sačuvana. Provjerite dozvole i pokušajte ponovo.",
    };
  }
}
export async function archiveContent(data: FormData) {
  const kind = value(data, "kind") as ContentKind;
  if (!contentKinds.includes(kind)) throw new Error("INVALID_INPUT");
  const user = await requireApiPermission(kind === "job" ? "jobs.manage" : "content.manage");
  await contentAdmin(user, "archive", {
    kind,
    id: checkedUuid(value(data, "id")),
    version: value(data, "version"),
  });
  updateTag("site-content");
  revalidatePath("/", "layout");
}
export async function processApplication(_state: CmsState, data: FormData): Promise<CmsState> {
  try {
    const user = await requireApiPermission("applications.manage");
    await contentAdmin(user, "application_update", {
      id: checkedUuid(value(data, "id")),
      status: value(data, "status"),
      notes: value(data, "notes"),
    });
    revalidatePath("/admin/prijave", "layout");
    return { ok: true, message: "Status i interna bilješka su sačuvani." };
  } catch {
    return { ok: false, message: "Promjena nije sačuvana. Provjerite dozvole i pokušajte ponovo." };
  }
}
export async function deleteApplication(data: FormData) {
  const user = await requireApiPermission("applications.manage");
  if (value(data, "confirmed") !== "yes") throw new Error("Potvrdite brisanje.");
  const id = checkedUuid(value(data, "id"));
  const entry = await contentAdmin<Application>(user, "application", { id });
  if (entry.attachments.length) {
    const { error } = await createAdminClient()
      .storage.from(applicationBucket)
      .remove(entry.attachments.map((a) => a.path));
    if (error) throw new Error("Prilozi nisu obrisani; prijava je sačuvana za ponovni pokušaj.");
  }
  await contentAdmin(user, "application_delete", { id });
  revalidatePath("/admin/prijave", "layout");
  const { redirect } = await import("next/navigation");
  redirect("/admin/prijave");
}
