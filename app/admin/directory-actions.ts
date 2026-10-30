"use server";
import { requireApiPermission } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, updateTag } from "next/cache";
import type { DirectoryRecord } from "@/lib/directory-types";
import { checkedUpload } from "@/lib/uploads";
import { assetUrl } from "@/lib/cms-types";

const text = (data: FormData, key: string, max = 200) => {
  const value = String(data.get(key) ?? "").trim();
  if (value.length > max) throw new Error("Provjerite dužinu unesenih podataka.");
  return value;
};
export async function saveDirectory(_state: { message: string }, form: FormData) {
  const user = await requireApiPermission("directory.manage");
  try {
    const kind = text(form, "kind"),
      id = text(form, "id", 150);
    if (!["member", "location"].includes(kind) || !/^[a-z0-9][a-z0-9-]{0,149}$/.test(id))
      throw new Error("Provjerite URL oznaku.");
    const client = createAdminClient();
    const identity = { p_tenant_id: user.tenant_id, p_object_id: user.object_id };
    const { data: rows, error: readError } = await client.rpc("penny_directory_admin", {
      ...identity,
      p_action: "list",
      p_payload: { kind },
    });
    if (readError) throw new Error("Imenik nije dostupan.");
    const existing = (rows as DirectoryRecord[]).find((row) => row.id === id);
    const name = text(form, "name"),
      phone = text(form, "phone", 50);
    if (name.length < 2 || (phone && !/^[+\d\s/().-]+$/.test(phone)))
      throw new Error("Provjerite ime i telefon.");
    let data: Record<string, unknown> = { ...existing?.data, name, phone };
    if (kind === "location") {
      const type = text(form, "type");
      if (!["PennyPlus", "Penny marketi", "Rezni centar", "Toys&Fun igraonice"].includes(type))
        throw new Error("Provjerite tip lokacije.");
      const email = text(form, "email", 320);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Provjerite e-mail adresu.");
      data = {
        ...data,
        slug: id,
        type,
        title: text(form, "title"),
        address: text(form, "address"),
        city: text(form, "city"),
        hours: text(form, "hours", 500),
        displayPhone: phone,
        email,
        services: text(form, "services", 1000)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (![data.title, data.address, data.city, data.hours].every(Boolean))
        throw new Error("Provjerite obavezna polja lokacije.");
    } else {
      const emails = text(form, "emails", 1500)
        .split(/[\s,;]+/)
        .filter(Boolean);
      if (emails.length > 5 || emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
        throw new Error("Provjerite e-mail adrese.");
      let image = text(form, "image", 1000);
      const photo = form.get("photo");
      if (photo instanceof File && photo.size) {
        if (photo.size > 3 * 1024 * 1024)
          throw new Error("Provjerite fotografiju: najveća veličina je 3 MB.");
        const upload = await checkedUpload(photo);
        if (!upload.mime.startsWith("image/"))
          throw new Error("Provjerite fotografiju: dodajte JPG, PNG ili WebP.");
        const path = `directory/${upload.hash}.${upload.ext}`;
        const { error } = await client.storage.from("site-assets").upload(path, upload.bytes, {
          contentType: upload.mime,
          cacheControl: "31536000",
          upsert: false,
        });
        if (error && String(error.statusCode) !== "409")
          throw new Error("Imenik nije sačuvan: fotografija nije prenesena.");
        image = assetUrl(path);
      }
      const allowed = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
      if (image) {
        const url = new URL(image);
        if (
          url.origin !== allowed.origin ||
          !/^\/storage\/v1\/object\/public\/(team-photos|site-assets)\//.test(url.pathname)
        )
          throw new Error("Provjerite fotografiju: koristite javnu Storage adresu projekta.");
      }
      const departmentId = text(form, "departmentId", 150),
        departmentName = text(form, "departmentName");
      if (!/^[a-z0-9][a-z0-9-]{0,149}$/.test(departmentId) || !departmentName)
        throw new Error("Provjerite službu.");
      data = {
        ...data,
        id,
        role: text(form, "role"),
        emails,
        departmentId,
        departmentName,
        image: { src: image || "/penny.png", width: 340, height: 300 },
      };
    }
    const { data: saved, error } = await client.rpc("penny_directory_admin", {
      ...identity,
      p_action: "save",
      p_payload: {
        kind,
        id,
        data,
        published: form.get("published") === "yes",
        position: Number(form.get("position")) || 0,
        version: text(form, "version"),
      },
    });
    if (error)
      throw new Error(
        error.message === "CONFLICT"
          ? "Zapis je izmijenjen. Osvježite stranicu prije ponovnog uređivanja."
          : "Imenik nije sačuvan.",
      );
    updateTag("site-directory");
    revalidatePath("/", "layout");
    return {
      message: "Sačuvano. Objavljeni podaci su ažurirani na javnoj stranici.",
      version: (saved as DirectoryRecord[]).find((row) => row.id === id)?.updated_at,
    };
  } catch (error) {
    return {
      message:
        error instanceof Error && /^(Provjerite|Imenik|Zapis)/.test(error.message)
          ? error.message
          : "Imenik nije sačuvan. Provjerite podatke.",
    };
  }
}
