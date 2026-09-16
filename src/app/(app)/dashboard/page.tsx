import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/current-user";
import { Card, EmptyState, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Flame, FileText, ListChecks, Layers, MessageCircle, Upload } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: progress }, { data: documents }, { data: subjects }, { data: upcomingTasks }, { data: recentAttempts }] =
    await Promise.all([
      supabase.from("progress").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("subjects").select("*").eq("user_id", user.id),
      supabase
        .from("study_tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .gte("scheduled_date", new Date().toISOString().slice(0, 10))
        .order("scheduled_date", { ascending: true })
        .limit(5),
      supabase.from("quiz_attempts").select("*, quizzes(title)").eq("user_id", user.id).order("started_at", { ascending: false }).limit(5),
    ]);

  const stats = [
    { label: "Study streak", value: `${progress?.current_streak_days ?? 0} days`, icon: Flame },
    { label: "Documents", value: documents?.length ?? 0, icon: FileText },
    { label: "Quizzes taken", value: progress?.total_quizzes_taken ?? 0, icon: ListChecks },
    { label: "Flashcards reviewed", value: progress?.total_flashcards_reviewed ?? 0, icon: Layers },
  ];

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent documents</h2>
            <Link href="/documents" className="text-xs text-white/40 hover:text-white">View all</Link>
          </div>
          {documents && documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-white/40" />
                    <span className="text-sm text-white">{doc.title}</span>
                  </div>
                  <Badge tone={doc.status === "ready" ? "success" : doc.status === "error" ? "danger" : "warning"}>
                    {doc.status}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No documents yet"
              description="Upload your first study material to get started."
              action={
                <Button href="/documents">
                  <Upload size={16} /> Upload document
                </Button>
              }
            />
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Upcoming study tasks</h2>
            <Link href="/study-plans" className="text-xs text-white/40 hover:text-white">View plans</Link>
          </div>
          {upcomingTasks && upcomingTasks.length > 0 ? (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="rounded-xl bg-white/5 px-4 py-3">
                  <p className="text-sm text-white">{task.title}</p>
                  <p className="mt-0.5 text-xs text-white/40">{task.scheduled_date}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No upcoming tasks" description="Create a study plan to see your schedule here." />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-white">Recent quiz performance</h2>
          {recentAttempts && recentAttempts.length > 0 ? (
            <div className="space-y-2">
              {recentAttempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <span className="text-sm text-white">{(a as any).quizzes?.title ?? "Quiz"}</span>
                  <span className="text-sm text-white/60">{a.score}/{a.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No quizzes yet" description="Generate a quiz from any document to test yourself." action={<Button href="/quizzes">Create a quiz</Button>} />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-white">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button href="/tutor" variant="secondary" className="justify-start">
              <MessageCircle size={16} /> Ask AI Tutor
            </Button>
            <Button href="/documents" variant="secondary" className="justify-start">
              <Upload size={16} /> Upload document
            </Button>
            <Button href="/quizzes" variant="secondary" className="justify-start">
              <ListChecks size={16} /> New quiz
            </Button>
            <Button href="/flashcards" variant="secondary" className="justify-start">
              <Layers size={16} /> Flashcards
            </Button>
          </div>
          {subjects && subjects.length === 0 && (
            <p className="mt-4 text-xs text-white/40">Tip: organize documents into subjects from the Documents page.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
