import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQuizSchema } from "@/lib/validation/schemas";
import { checkEntitlement, recordUsage } from "@/lib/usage/entitlements";
import { retrieveRelevantChunks } from "@/lib/ai/rag";
import { generateJSON } from "@/lib/ai/gemini";
import { logSystemError } from "@/lib/observability/log-error";

interface QuizQuestionAI {
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documentId = request.nextUrl.searchParams.get("documentId");
  let query = supabase.from("quizzes").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (documentId) query = query.eq("document_id", documentId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quizzes: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = generateQuizSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const entitlement = await checkEntitlement(supabase, user.id, "quiz_generations");
  if (!entitlement.allowed) {
    return NextResponse.json({ error: `You've used all ${entitlement.limit} quiz generations this month. Upgrade to generate more.` }, { status: 403 });
  }

  const { documentId, difficulty, questionCount, topic } = parsed.data;
  const { data: doc } = await supabase.from("documents").select("id, title, status").eq("id", documentId).eq("user_id", user.id).single();
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (doc.status !== "ready") return NextResponse.json({ error: "Document is not ready yet." }, { status: 400 });

  const chunks = await retrieveRelevantChunks(supabase, user.id, topic || doc.title, { documentId, limit: 10 });
  const context = chunks.map((c) => c.content).join("\n\n").slice(0, 14000);

  try {
    const result = await generateJSON<{ questions: QuizQuestionAI[] }>(
      `Create exactly ${questionCount} multiple-choice questions at ${difficulty} difficulty${topic ? ` about "${topic}"` : ""}, based strictly on this material:\n\n${context}\n\nRespond with JSON: { "questions": [{ "question": string, "options": string[4], "correct_option_index": number (0-3), "explanation": string }] }`,
      "You are an exam question writer. Base every question on the provided material only."
    );

    if (!result.questions || result.questions.length === 0) throw new Error("The AI did not return any questions.");

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        user_id: user.id,
        document_id: documentId,
        title: topic ? `${doc.title} — ${topic}` : doc.title,
        difficulty,
        question_count: result.questions.length,
      })
      .select()
      .single();
    if (quizError || !quiz) throw new Error(quizError?.message ?? "Failed to save quiz.");

    const { error: questionsError } = await supabase.from("quiz_questions").insert(
      result.questions.map((q, i) => ({
        quiz_id: quiz.id,
        question_index: i,
        question: q.question,
        options: q.options,
        correct_option_index: q.correct_option_index,
        explanation: q.explanation,
      }))
    );
    if (questionsError) throw new Error(questionsError.message);

    await recordUsage(supabase, user.id, "quiz_generations");
    return NextResponse.json({ quiz });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate quiz.";
    await logSystemError(supabase, { userId: user.id, scope: "quiz_generation", message, metadata: { documentId } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
