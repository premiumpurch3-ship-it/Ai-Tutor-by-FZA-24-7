import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/current-user";
import { Card, Badge } from "@/components/ui/primitives";
import { BillingActions } from "@/components/dashboard/billing-actions";
import { Check } from "lucide-react";

export default async function BillingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: subscription }, { data: plans }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
    supabase.from("plans").select("*").order("price_monthly_cents", { ascending: true }),
  ]);

  const currentPlanId = subscription?.plan_id ?? "free";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Billing</h1>
        <p className="text-sm text-white/50">Manage your subscription and usage limits.</p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/50">Current plan</p>
            <p className="text-2xl font-semibold text-white capitalize">{currentPlanId}</p>
          </div>
          <Badge tone={subscription?.status === "active" ? "success" : subscription?.status === "past_due" ? "danger" : "default"}>
            {subscription?.status ?? "none"}
          </Badge>
        </div>
        {subscription?.stripe_customer_id && (
          <div className="mt-4">
            <BillingActions mode="portal" />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(plans ?? []).map((plan) => (
          <Card key={plan.id} className={plan.id === currentPlanId ? "border-[var(--primary)]/50" : ""}>
            <h3 className="font-semibold text-white capitalize">{plan.name}</h3>
            <p className="mt-1 text-2xl font-semibold text-white">
              ${(plan.price_monthly_cents / 100).toFixed(2)}
              <span className="text-sm font-normal text-white/40">/mo</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/60">
              <li className="flex items-center gap-2"><Check size={14} className="text-[var(--accent)]" /> {plan.ai_messages_per_month} AI messages/mo</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-[var(--accent)]" /> {plan.documents_limit} documents</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-[var(--accent)]" /> {plan.quiz_generations_per_month} quiz generations</li>
              {plan.audio_enabled && <li className="flex items-center gap-2"><Check size={14} className="text-[var(--accent)]" /> Audio explanations</li>}
              {plan.advanced_analytics && <li className="flex items-center gap-2"><Check size={14} className="text-[var(--accent)]" /> Advanced analytics</li>}
            </ul>
            {plan.id !== "free" && plan.id !== currentPlanId && (
              <div className="mt-4">
                <BillingActions mode="checkout" planId={plan.id} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
