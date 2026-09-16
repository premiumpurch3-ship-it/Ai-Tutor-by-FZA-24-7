import { requireAdmin } from "@/lib/actions/current-user";
import { AdminStatsView } from "@/components/admin/stats-view";

export default async function AdminPage() {
  await requireAdmin();
  return <AdminStatsView />;
}
