import { requireApiPermission } from "@/lib/admin/access";
import { contentAdmin } from "@/lib/cms";
import { applicationBucket, type Application } from "@/lib/cms-types";
import { AccessError, checkedUuid } from "@/lib/admin/policy";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
  try {
    const user = await requireApiPermission("applications.manage");
    const { id } = await params;
    const entry = await contentAdmin<Application>(user, "application", { id: checkedUuid(id) });
    const index = Number(new URL(request.url).searchParams.get("index"));
    const file = Number.isInteger(index) && index >= 0 ? entry.attachments[index] : undefined;
    if (!file || !file.path.startsWith(`${entry.id}/`))
      return new Response("Nije pronađeno.", { status: 404, headers });
    const { data, error } = await createAdminClient()
      .storage.from(applicationBucket)
      .download(file.path);
    if (error || !data) return new Response("Prilog nije dostupan.", { status: 404, headers });
    return new Response(data, {
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return new Response("Pristup nije dozvoljen.", {
      status: error instanceof AccessError ? (error.code === "UNAUTHENTICATED" ? 401 : 403) : 404,
      headers,
    });
  }
}
