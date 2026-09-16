import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/current-user";
import { Card } from "@/components/ui/primitives";
import { Flame, Trophy, Layers, Clock } from "lucide-react";
import { ProgressCharts } from "@/components/dashboard/progress-charts";

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export default async function ProgressPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: progress }, { data: usage }, { data: attempts }, { data: reviews }, { data: subscription }] = await Promise.all([
    supabase.from("progress").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("usage").select("*").eq("user_id", user.id).eq("period_start", currentPeriodStart()).maybeSingle(),
    supabase.from("quiz_attempts").select("score, total, started_at").eq("user_id", user.id).order("started_at", { ascending: true }).limit(30),
    supabase.from("flashcard_reviews").select("result, reviewed_at").eq("user_id", user.id).order("reviewed_at", { ascending: true }).limit(200),
    supabase.from("subscriptions").select("plan_id").eq("user_id", user.id).single(),
  ]);

  const { data: plan } = await supabase.from("plans").select("*").eq("id", subscription?.plan_id ?? "free").single();

  const quizScoreSeries = (attempts ?? []).map((a) => ({
    date: new Date(a.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    percent: a.total > 0 ? Math.round((a.score / a.total) * 100) : 0,
  }));

  const flashcardTally = (reviews ?? []).reduce(
    (acc, r) => {
      if (r.result === "known") acc.known += 1;
      else acc.unknown += 1;
      return acc;
    },
    { known: 0, unknown: 0 }
  );

  const stats = [
    { label: "Current streak", value: `${progress?.current_streak_days ?? 0} days`, icon: Flame },
    { label: "Longest streak", value: `${progress?.longest_streak_days ?? 0} days`, icon: Trophy },
    { label: "Total quizzes taken", value: progress?.total_quizzes_taken ?? 0, icon: Layers },
    { label: "Total study time", value: `${Math.round((progress?.total_study_seconds ?? 0) / 60)} min`, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Progress</h1>
        <p className="text-sm text-white/50">Your real learning activity, tracked automatically.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">{s.label}</p>
              <s.icon size={18} className="text-white/30" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-1 font-semibold text-white">This month&apos;s AI usage</h2>
        <p className="mb-4 text-xs text-white/40">{plan?.name ?? "Free"} plan</p>
        <div className="space-y-3">
          {[
            { label: "AI messages", used: usage?.ai_messages_used ?? 0, limit: plan?.ai_messages_per_month ?? 0 },
            { label: "Quiz generations", used: usage?.quiz_generations_used ?? 0, limit: plan?.quiz_generations_per_month ?? 0 },
            { label: "Flashcard generations", used: usage?.flashcard_generations_used ?? 0, limit: plan?.flashcard_generations_per_month ?? 0 },
          ].map((u) => (
            <div key={u.label}>
              <div className="flex justify-between text-xs text-white/50">
                <span>{u.label}</span>
                <span>{u.used} / {u.limit}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/5">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)]"
                  style={{ width: `${u.limit > 0 ? Math.min(100, (u.used / u.limit) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ProgressCharts quizScoreSeries={quizScoreSeries} flashcardTally={flashcardTally} />
    </div>
  );
}
