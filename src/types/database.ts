// Hand-maintained types matching supabase/migrations/*.sql.
// To regenerate from a live project instead, run: npm run db:types

export type PlanTier = "free" | "student" | "pro";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "none";
export type DocumentStatus = "uploaded" | "processing" | "ready" | "error";
export type MessageRole = "user" | "assistant" | "system";
export type AppRole = "user" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  is_suspended: boolean;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: PlanTier;
  name: string;
  price_monthly_cents: number;
  stripe_price_id: string | null;
  ai_messages_per_month: number;
  documents_limit: number;
  quiz_generations_per_month: number;
  flashcard_generations_per_month: number;
  audio_enabled: boolean;
  advanced_analytics: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: PlanTier;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface Usage {
  id: string;
  user_id: string;
  period_start: string;
  ai_messages_used: number;
  quiz_generations_used: number;
  flashcard_generations_used: number;
  documents_uploaded: number;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  file_path: string;
  file_type: string;
  file_size_bytes: number;
  status: DocumentStatus;
  error_message: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  token_estimate: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  sources: { document_id: string; chunk_id: string; snippet: string }[];
  created_at: string;
}

export interface Lesson {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string;
  content: {
    explanation: string;
    key_concepts: string[];
    examples: string[];
    review_questions: string[];
  };
  created_at: string;
}

export interface Summary {
  id: string;
  user_id: string;
  document_id: string;
  scope: "document" | "chapter" | "topic";
  content: { summary: string; key_points: string[]; definitions: { term: string; definition: string }[] };
  created_at: string;
}

export interface Quiz {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  question_count: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_index: number;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string | null;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: { question_id: string; selected_index: number }[];
  score: number;
  total: number;
  started_at: string;
  completed_at: string | null;
}

export interface FlashcardDeck {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string;
  created_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  user_id: string;
  question: string;
  answer: string;
  known_streak: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  goal: string | null;
  exam_date: string | null;
  hours_per_week: number | null;
  created_at: string;
}

export interface StudyTask {
  id: string;
  study_plan_id: string;
  user_id: string;
  title: string;
  task_type: "study" | "revision" | "quiz";
  scheduled_date: string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface ProgressRow {
  user_id: string;
  current_streak_days: number;
  longest_streak_days: number;
  last_active_date: string | null;
  total_study_seconds: number;
  total_quizzes_taken: number;
  total_flashcards_reviewed: number;
}

// Minimal Database generic so @supabase/ssr's generics are satisfied.
// Extend with `supabase gen types typescript` for full type safety if desired.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
