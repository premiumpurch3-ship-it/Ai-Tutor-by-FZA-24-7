import { requireAdmin } from "@/lib/actions/current-user";
import { AdminUsersView } from "@/components/admin/users-view";

export default async function AdminUsersPage() {
  await requireAdmin();
  return <AdminUsersView />;
}
