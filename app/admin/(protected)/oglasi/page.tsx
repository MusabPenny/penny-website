import { requirePermission } from "@/lib/admin/access";
import { contentEntrySnapshot } from "@/lib/cms";
import { EntryWorkspace } from "@/components/admin/entry-workspace";
export default async function JobsAdmin({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    new?: string;
    query?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const user = await requirePermission("jobs.manage");
  const params = await searchParams;
  const snapshot = await contentEntrySnapshot(user, "job", params);
  return <EntryWorkspace {...snapshot} kind="job" edit={params.edit} create={params.new} />;
}
