import { requireProfile } from "@/lib/actions/current-user";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, subscription } = await requireProfile();

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar isAdmin={profile.role === "admin"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} subscription={subscription} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
