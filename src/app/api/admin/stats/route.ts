import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    { count: totalUsers },
    { count: newUsers30d },
    { count: totalDocuments },
    { count: totalQuizAttempts },
    { count: totalConversations },
    { data: subsByPlan },
    { data: recentErrors },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("plan_id, status"),
    supabase.from("system_errors").select("*").order("created_at", { ascending: false }).limit(20),
  ]);

  const planDistribution: Record<string, number> = {};
  let activeUsers = 0;
  (subsByPlan ?? []).forEach((s) => {
    planDistribution[s.plan_id] = (planDistribution[s.plan_id] ?? 0) + 1;
    if (s.status === "active" || s.status === "trialing") activeUsers += 1;
  });

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    newUsers30d: newUsers30d ?? 0,
    activeUsers,
    totalDocuments: totalDocuments ?? 0,
    totalQuizAttempts: totalQuizAttempts ?? 0,
    totalConversations: totalConversations ?? 0,
    planDistribution,
    recentErrors,
    _sevenDaysAgo: sevenDaysAgo,
    // Revenue is intentionally omitted here — Stripe is the source of truth
    // for money figures. Link out to the Stripe Dashboard instead of
    // recomputing/estimating revenue from local subscription rows.
  });
}
