import type { SupabaseClient } from "@supabase/supabase-js";

interface ActivityDelta {
  quizzesTaken?: number;
  flashcardsReviewed?: number;
  studySeconds?: number;
}

function isConsecutiveDay(prevISO: string | null, todayISO: string): boolean {
  if (!prevISO) return false;
  const prev = new Date(prevISO + "T00:00:00Z");
  const today = new Date(todayISO + "T00:00:00Z");
  const diffDays = Math.round((today.getTime() - prev.getTime()) / 86_400_000);
  return diffDays === 1;
}

/**
 * Called after a real, completed learning activity (quiz submitted,
 * flashcard reviewed, study session logged) to update the progress rollup
 * used on the dashboard and analytics page. Never call this speculatively —
 * every increment here should correspond to something that actually happened.
 */
export async function bumpProgressAfterActivity(
  supabase: SupabaseClient,
  userId: string,
  delta: ActivityDelta
): Promise<void> {
  const todayISO = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase.from("progress").select("*").eq("user_id", userId).maybeSingle();

  if (!existing) {
    await supabase.from("progress").insert({
      user_id: userId,
      current_streak_days: 1,
      longest_streak_days: 1,
      last_active_date: todayISO,
      total_study_seconds: delta.studySeconds ?? 0,
      total_quizzes_taken: delta.quizzesTaken ?? 0,
      total_flashcards_reviewed: delta.flashcardsReviewed ?? 0,
    });
    return;
  }

  const sameDay = existing.last_active_date === todayISO;
  const consecutive = isConsecutiveDay(existing.last_active_date, todayISO);

  const newStreak = sameDay ? existing.current_streak_days : consecutive ? existing.current_streak_days + 1 : 1;

  await supabase
    .from("progress")
    .update({
      current_streak_days: newStreak,
      longest_streak_days: Math.max(existing.longest_streak_days, newStreak),
      last_active_date: todayISO,
      total_study_seconds: existing.total_study_seconds + (delta.studySeconds ?? 0),
      total_quizzes_taken: existing.total_quizzes_taken + (delta.quizzesTaken ?? 0),
      total_flashcards_reviewed: existing.total_flashcards_reviewed + (delta.flashcardsReviewed ?? 0),
    })
    .eq("user_id", userId);
}
