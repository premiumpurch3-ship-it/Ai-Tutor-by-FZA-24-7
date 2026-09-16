import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitQuizSchema } from "@/lib/validation/schemas";
import { bumpProgressAfterActivity } from "@/lib/progress/rollup";
import { gradeQuiz } from "@/lib/quiz/grade";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = submitQuizSchema.safeParse({ ...(await request.json()), quizId });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { data: quiz } = await supabase.from("quizzes").select("id").eq("id", quizId).eq("user_id", user.id).single();
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const { data: questions, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("id, correct_option_index, explanation, question, options")
    .eq("quiz_id", quizId);
  if (questionsError || !questions) return NextResponse.json({ error: "Could not load quiz questions." }, { status: 500 });

  const { score, total, gradedAnswers } = gradeQuiz(questions, parsed.data.answers);

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: user.id,
      answers: gradedAnswers,
      score,
      total,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (attemptError) return NextResponse.json({ error: attemptError.message }, { status: 500 });

  await bumpProgressAfterActivity(supabase, user.id, { quizzesTaken: 1 });

  return NextResponse.json({
    attempt,
    review: questions.map((q) => ({
      questionId: q.id,
      question: q.question,
      options: q.options,
      correctOptionIndex: q.correct_option_index,
      explanation: q.explanation,
      selectedIndex: parsed.data.answers.find((a) => a.questionId === q.id)?.selectedIndex ?? null,
    })),
  });
}
