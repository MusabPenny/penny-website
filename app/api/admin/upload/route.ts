import { randomUUID } from "node:crypto";
import { requireApiPermission } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { contentKinds } from "@/lib/cms-types";
import { signReceipt } from "@/lib/upload-receipt";
import { smallJson } from "@/lib/request-json";
import type { ContentKind } from "@/lib/cms-types";
export async function POST(request: Request) {
  try {
    const input = (await smallJson(request)) as { kind: ContentKind; name: string; size: number };
    if (
      !contentKinds.includes(input.kind) ||
      typeof input.name !== "string" ||
      typeof input.size !== "number" ||
      input.size <= 0 ||
      input.size > 10 * 1024 * 1024
    )
      return Response.json({ error: "Provjerite fajl (najviše 10 MB)." }, { status: 400 });
    const user = await requireApiPermission(
      input.kind === "job" ? "jobs.manage" : "content.manage",
    );
    const ext = input.name.split(".").pop()?.toLowerCase() ?? "";
    if (
      !["pdf", "jpg", "jpeg", "png", "webp"].includes(ext) ||
      (["catalog", "document"].includes(input.kind) && ext !== "pdf")
    )
      return Response.json({ error: "Nepodržan format." }, { status: 400 });
    const path = `${user.id}/${randomUUID()}.${ext}`;
    const { data, error } = await createAdminClient()
      .storage.from("upload-staging")
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !data) throw new Error("Upload");
    return Response.json(
      {
        url: data.signedUrl,
        receipt: signReceipt({
          user: user.id,
          kind: input.kind,
          path,
          name: input.name.slice(0, 160),
          size: input.size,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Upload nije dostupan. Provjerite prijavu i dozvole." },
      { status: 403 },
    );
  }
}
