import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, PlanTier } from "@/types/database";

export type UsageFeature =
  | "ai_messages"
  | "documents"
  | "quiz_generations"
  | "flashcard_generations";

const FEATURE_TO_COLUMN: Record<UsageFeature, string> = {
  ai_messages: "ai_messages_used",
  documents: "documents_uploaded",
  quiz_generations: "quiz_generations_used",
  flashcard_generations: "flashcard_generations_used",
};

const FEATURE_TO_LIMIT_COLUMN: Record<UsageFeature, keyof Plan> = {
  ai_messages: "ai_messages_per_month",
  documents: "documents_limit",
  quiz_generations: "quiz_generations_per_month",
  flashcard_generations: "flashcard_generations_per_month",
};

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export interface EntitlementCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  plan: PlanTier;
  reason?: string;
}

/**
 * Checks whether a user may perform `feature` one more time, given their
 * current subscription plan and this month's usage. Does NOT mutate usage —
 * call recordUsage() only after the underlying action actually succeeds.
 *
 * This must be called from server-side code (Route Handler / Server Action)
 * using a client whose RLS context is either the user's own session or the
 * service role — never trust a client-supplied "allowed" flag.
 */
export async function checkEntitlement(
  supabase: SupabaseClient,
  userId: string,
  feature: UsageFeature
): Promise<EntitlementCheck> {
  const { data: subscription, error: subErr } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", userId)
    .single();

  if (subErr || !subscription) {
    return { allowed: false, used: 0, limit: 0, remaining: 0, plan: "free", reason: "No subscription record found." };
  }

  // A canceled/past_due subscription still on a paid tier falls back to free limits.
  const effectivePlan: PlanTier =
    subscription.status === "active" || subscription.status === "trialing"
      ? subscription.plan_id
      : "free";

  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select("*")
    .eq("id", effectivePlan)
    .single();

  if (planErr || !plan) {
    return { allowed: false, used: 0, limit: 0, remaining: 0, plan: effectivePlan, reason: "Plan not found." };
  }

  const period = currentPeriodStart();
  const { data: usage } = await supabase
    .from("usage")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", period)
    .maybeSingle();

  const column = FEATURE_TO_COLUMN[feature];
  const used = usage ? (usage as unknown as Record<string, number>)[column] ?? 0 : 0;
  const limit = (plan as unknown as Record<string, number>)[FEATURE_TO_LIMIT_COLUMN[feature]] ?? 0;

  // documents_limit is a cap on total stored documents, not a monthly counter —
  // callers pass the current document count as `used` via checkDocumentLimit below.

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    plan: effectivePlan,
  };
}

/** Document count is a standing cap, not monthly — check against the live row count. */
export async function checkDocumentLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<EntitlementCheck> {
  const base = await checkEntitlement(supabase, userId, "documents");

  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const used = count ?? 0;
  return { ...base, used, remaining: Math.max(0, base.limit - used), allowed: used < base.limit };
}

/**
 * Increments this month's usage counter for `feature` by 1 (or `amount`).
 * Uses an upsert so the first action of a new month creates the row.
 */
export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: Exclude<UsageFeature, "documents">,
  amount = 1
): Promise<void> {
  const period = currentPeriodStart();
  const column = FEATURE_TO_COLUMN[feature];

  const { data: existing } = await supabase
    .from("usage")
    .select("id, ai_messages_used, quiz_generations_used, flashcard_generations_used")
    .eq("user_id", userId)
    .eq("period_start", period)
    .maybeSingle();

  if (!existing) {
    await supabase.from("usage").insert({
      user_id: userId,
      period_start: period,
      [column]: amount,
    });
    return;
  }

  const currentValue = (existing as unknown as Record<string, number>)[column] ?? 0;
  await supabase
    .from("usage")
    .update({ [column]: currentValue + amount })
    .eq("id", existing.id);
}
