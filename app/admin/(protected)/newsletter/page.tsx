import { requirePermission } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeading } from "@/components/admin/ui";
import { SubscriberTable, type SubscriberRow } from "@/components/admin/subscriber-table";
export default async function Subscribers({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string; status?: string }>;
}) {
  const user = await requirePermission("content.manage");
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(params.page) || 1)));
  const { data, error } = await createAdminClient().rpc("penny_browse_subscribers", {
    p_payload: { ...params, page },
    p_tenant_id: user.tenant_id,
    p_object_id: user.object_id,
  });
  let result = data as { entries: SubscriberRow[]; total: number } | null;
  if (error && ["PGRST202", "42883"].includes(error.code)) {
    const legacy = await createAdminClient().rpc("penny_newsletter", {
      p_tenant_id: user.tenant_id,
      p_object_id: user.object_id,
      p_action: "list",
      p_payload: {},
    });
    if (legacy.error) throw new Error("Lista trenutno nije dostupna.");
    const filtered = (legacy.data as SubscriberRow[]).filter(
      (row) =>
        row.email.includes((params.query ?? "").toLowerCase()) &&
        (!params.status ||
          (params.status === "active" ? !row.unsubscribed_at : Boolean(row.unsubscribed_at))),
    );
    result = { entries: filtered.slice((page - 1) * 15, page * 15), total: filtered.length };
  } else if (error) throw new Error("Lista trenutno nije dostupna.");
  if (!result) throw new Error("Lista trenutno nije dostupna.");
  return (
    <>
      <AdminHeading
        eyebrow="MARKETING"
        title="Newsletter prijave"
        description="Pretraga svih pretplatnika i odjava. Slanje kampanja nije automatsko; poštujte odjave."
      />
      <SubscriberTable
        key={JSON.stringify(params)}
        entries={result.entries}
        total={result.total}
        page={page}
        query={params.query}
        status={params.status}
      />
    </>
  );
}
