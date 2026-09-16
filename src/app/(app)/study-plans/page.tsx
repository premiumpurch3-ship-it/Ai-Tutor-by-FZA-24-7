import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/current-user";
import { StudyPlanGenerator } from "@/components/study-plans/plan-generator";
import { Card, EmptyState } from "@/components/ui/primitives";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

export default async function StudyPlansPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: plans }, { data: documents }, { data: subjects }] = await Promise.all([
    supabase.from("study_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("documents").select("id, title").eq("user_id", user.id).eq("status", "ready"),
    supabase.from("subjects").select("*").eq("user_id", user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Study Plans</h1>
        <p className="text-sm text-white/50">Let AI build a day-by-day plan around your goal and exam date.</p>
      </div>

      <StudyPlanGenerator documents={documents ?? []} subjects={subjects ?? []} />

      {plans && plans.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Link key={p.id} href={`/study-plans/${p.id}`}>
              <Card className="h-full transition-colors hover:border-[var(--primary)]/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50"><CalendarClock size={18} /></div>
                <h3 className="mt-3 font-medium text-white">{p.title}</h3>
                {p.exam_date && <p className="mt-1 text-xs text-white/40">Exam: {p.exam_date}</p>}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card><EmptyState title="No study plans yet" description="Create one above to get a personalized schedule." /></Card>
      )}
    </div>
  );
}
