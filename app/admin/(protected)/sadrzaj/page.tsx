import { requirePermission } from "@/lib/admin/access";
import { contentEntrySnapshot } from "@/lib/cms";
import { contentKinds, type ContentKind } from "@/lib/cms-types";
import { EntryWorkspace } from "@/components/admin/entry-workspace";
export default async function ContentAdmin({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    edit?: string;
    new?: string;
    query?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const user = await requirePermission("content.manage");
  const params = await searchParams;
  const kind = (
    params.kind !== "job" && contentKinds.includes(params.kind as ContentKind)
      ? params.kind
      : "news"
  ) as ContentKind;
  const snapshot = await contentEntrySnapshot(user, kind, params);
  return <EntryWorkspace {...snapshot} kind={kind} edit={params.edit} create={params.new} />;
}
