import { requireApprovedUser } from "@/lib/admin/access";
import { AdminShell } from "@/components/admin/shell";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireApprovedUser();
  return <AdminShell user={user}>{children}</AdminShell>;
}
