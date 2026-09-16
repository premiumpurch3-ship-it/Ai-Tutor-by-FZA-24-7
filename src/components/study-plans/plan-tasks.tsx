"use client";

import { useEffect, useState } from "react";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import type { StudyPlan, StudyTask } from "@/types/database";

export function StudyPlanTasks({ planId }: { planId: string }) {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/study-plans/${planId}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not load study plan.");
        return;
      }
      setPlan(json.plan);
      setTasks(json.tasks);
      setLoading(false);
    })();
  }, [planId]);

  async function toggleTask(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_completed: !t.is_completed } : t)));
    const res = await fetch(`/api/study-plans/${planId}/tasks/${taskId}`, { method: "PATCH" });
    if (!res.ok) {
      toast.error("Could not update task.");
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_completed: !t.is_completed } : t)));
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-white/30" /></div>;
  if (!plan) return null;

  const grouped = tasks.reduce<Record<string, StudyTask[]>>((acc, t) => {
    (acc[t.scheduled_date] ||= []).push(t);
    return acc;
  }, {});

  const completedCount = tasks.filter((t) => t.is_completed).length;

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-xl font-semibold text-white">{plan.title}</h1>
        {plan.goal && <p className="mt-1 text-sm text-white/50">{plan.goal}</p>}
        <div className="mt-3 flex items-center gap-2">
          {plan.exam_date && <Badge>Exam: {plan.exam_date}</Badge>}
          <Badge>{completedCount}/{tasks.length} completed</Badge>
        </div>
      </Card>

      {Object.keys(grouped).length === 0 ? (
        <Card><EmptyState title="No tasks in this plan" /></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dayTasks]) => (
              <Card key={date}>
                <h3 className="mb-3 text-sm font-medium text-white/60">{date}</h3>
                <div className="space-y-2">
                  {dayTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTask(t.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                        t.is_completed ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${t.is_completed ? "border-emerald-400 bg-emerald-400/20" : "border-white/20"}`}>
                        {t.is_completed && <Check size={12} />}
                      </span>
                      <span className={t.is_completed ? "line-through" : ""}>{t.title}</span>
                      <Badge>{t.task_type}</Badge>
                    </button>
                  ))}
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
