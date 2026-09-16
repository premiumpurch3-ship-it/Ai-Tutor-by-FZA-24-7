import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/current-user";
import { QuizGenerator } from "@/components/quizzes/quiz-generator";
import { Card, EmptyState, Badge } from "@/components/ui/primitives";
import Link from "next/link";

export default async function QuizzesPage({ searchParams }: { searchParams: Promise<{ documentId?: string }> }) {
  const user = await requireUser();
  const { documentId } = await searchParams;
  const supabase = await createClient();

  const [{ data: quizzes }, { data: documents }] = await Promise.all([
    supabase.from("quizzes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("documents").select("id, title").eq("user_id", user.id).eq("status", "ready"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Quizzes</h1>
        <p className="text-sm text-white/50">Test yourself with AI-generated quizzes from your documents.</p>
      </div>

      <QuizGenerator documents={documents ?? []} initialDocumentId={documentId} />

      {quizzes && quizzes.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => (
            <Link key={q.id} href={`/quizzes/${q.id}`}>
              <Card className="h-full transition-colors hover:border-[var(--primary)]/40">
                <h3 className="font-medium text-white">{q.title}</h3>
                <div className="mt-2 flex items-center gap-2">
                  <Badge>{q.question_count} questions</Badge>
                  <Badge>{q.difficulty}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card><EmptyState title="No quizzes yet" description="Generate one from a ready document above." /></Card>
      )}
    </div>
  );
}
