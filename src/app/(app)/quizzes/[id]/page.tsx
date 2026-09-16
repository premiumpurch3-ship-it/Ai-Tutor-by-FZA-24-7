import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/current-user";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ListChecks, Trophy } from "lucide-react";

export default async function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: quiz } = await supabase.from("quizzes").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!quiz) notFound();

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("quiz_id", id)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{quiz.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge>{quiz.question_count} questions</Badge>
            <Badge>{quiz.difficulty}</Badge>
          </div>
        </div>
        <Button href={`/quizzes/${id}/attempt`}>
          <ListChecks size={16} /> Take quiz
        </Button>
      </div>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><Trophy size={16} /> Attempt history</h2>
        {attempts && attempts.length > 0 ? (
          <div className="space-y-2">
            {attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                <span className="text-sm text-white/70">{new Date(a.started_at).toLocaleString()}</span>
                <span className="text-sm font-medium text-white">{a.score}/{a.total}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No attempts yet" description="Take the quiz to see your score here." />
        )}
      </Card>
    </div>
  );
}
