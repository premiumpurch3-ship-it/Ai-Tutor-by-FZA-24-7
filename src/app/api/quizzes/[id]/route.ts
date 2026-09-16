import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: quiz } = await supabase.from("quizzes").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const { data: questions, error } = await supabase
    .from("quiz_questions")
    .select("id, question_index, question, options") // correct_option_index withheld from the client
    .eq("quiz_id", id)
    .order("question_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("quiz_id", id)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  return NextResponse.json({ quiz, questions, attempts });
}
