import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reviewFlashcardSchema } from "@/lib/validation/schemas";
import { bumpProgressAfterActivity } from "@/lib/progress/rollup";

const INTERVALS_DAYS = [1, 2, 4, 8, 16, 32]; // simple spaced-repetition ladder

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = reviewFlashcardSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { flashcardId, result } = parsed.data;
  const { data: card } = await supabase.from("flashcards").select("*").eq("id", flashcardId).eq("user_id", user.id).single();
  if (!card) return NextResponse.json({ error: "Flashcard not found." }, { status: 404 });

  const newStreak = result === "known" ? card.known_streak + 1 : 0;
  const intervalDays = INTERVALS_DAYS[Math.min(newStreak, INTERVALS_DAYS.length - 1)];
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);

  const { error: updateError } = await supabase
    .from("flashcards")
    .update({ known_streak: newStreak, last_reviewed_at: new Date().toISOString(), next_review_at: nextReview.toISOString() })
    .eq("id", flashcardId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await supabase.from("flashcard_reviews").insert({ flashcard_id: flashcardId, user_id: user.id, result });
  await bumpProgressAfterActivity(supabase, user.id, { flashcardsReviewed: 1 });

  return NextResponse.json({ success: true, nextReviewAt: nextReview.toISOString(), knownStreak: newStreak });
}
