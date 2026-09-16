import { requireUser } from "@/lib/actions/current-user";
import { QuizAttemptRunner } from "@/components/quizzes/quiz-attempt-runner";

export default async function QuizAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return <QuizAttemptRunner quizId={id} />;
}
