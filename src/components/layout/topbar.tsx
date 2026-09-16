import { Badge } from "@/components/ui/primitives";
import type { Profile, Subscription } from "@/types/database";

export function Topbar({ profile, subscription }: { profile: Profile; subscription: Subscription | null }) {
  return (
    <header className="flex items-center justify-between border-b border-white/5 bg-[var(--background)]/80 px-6 py-4 backdrop-blur-xl">
      <div>
        <p className="text-sm text-white/40">Welcome back</p>
        <p className="font-medium text-white">{profile.full_name || profile.email}</p>
      </div>
      <Badge tone={subscription?.plan_id === "pro" ? "success" : "default"}>
        {(subscription?.plan_id ?? "free").toUpperCase()} plan
      </Badge>
    </header>
  );
}
