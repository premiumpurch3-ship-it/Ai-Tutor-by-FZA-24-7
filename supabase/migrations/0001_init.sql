-- ============================================================================
-- AI TUTOR — Initial schema
-- Run via: npm run db:migrate  (see scripts/db-migrate.mjs)
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
do $$ begin
  create type plan_tier as enum ('free', 'student', 'pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_status as enum ('uploaded', 'processing', 'ready', 'error');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_role as enum ('user', 'assistant', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role app_role not null default 'user',
  is_suspended boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

-- ----------------------------------------------------------------------------
-- PLANS (reference table — seeded, not user-editable)
-- ----------------------------------------------------------------------------
create table if not exists public.plans (
  id text primary key, -- 'free' | 'student' | 'pro'
  name text not null,
  price_monthly_cents integer not null default 0,
  stripe_price_id text,
  ai_messages_per_month integer not null,
  documents_limit integer not null,
  quiz_generations_per_month integer not null,
  flashcard_generations_per_month integer not null,
  audio_enabled boolean not null default false,
  advanced_analytics boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id) default 'free',
  status subscription_status not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);

-- ----------------------------------------------------------------------------
-- USAGE (monthly counters, one row per user per calendar month)
-- ----------------------------------------------------------------------------
create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null, -- first day of the month
  ai_messages_used integer not null default 0,
  quiz_generations_used integer not null default 0,
  flashcard_generations_used integer not null default 0,
  documents_uploaded integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, period_start)
);

create index if not exists idx_usage_user_period on public.usage(user_id, period_start);

-- ----------------------------------------------------------------------------
-- SUBJECTS
-- ----------------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text default '#6366f1',
  created_at timestamptz not null default now()
);

create index if not exists idx_subjects_user on public.subjects(user_id);

-- ----------------------------------------------------------------------------
-- DOCUMENTS
-- ----------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  file_path text not null, -- storage path
  file_type text not null, -- pdf | docx | txt
  file_size_bytes bigint not null default 0,
  status document_status not null default 'uploaded',
  error_message text,
  page_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_user on public.documents(user_id);
create index if not exists idx_documents_status on public.documents(status);

-- ----------------------------------------------------------------------------
-- DOCUMENT CHUNKS (simple lexical RAG — no external vector DB required)
-- ----------------------------------------------------------------------------
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_estimate integer not null default 0,
  content_tsv tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now()
);

create index if not exists idx_chunks_document on public.document_chunks(document_id);
create index if not exists idx_chunks_user on public.document_chunks(user_id);
create index if not exists idx_chunks_tsv on public.document_chunks using gin(content_tsv);

-- ----------------------------------------------------------------------------
-- CONVERSATIONS + MESSAGES (AI Tutor chat)
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_user on public.conversations(user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role message_role not null,
  content text not null,
  sources jsonb not null default '[]'::jsonb, -- referenced chunk ids/snippets
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id);

-- ----------------------------------------------------------------------------
-- LESSONS (AI-generated)
-- ----------------------------------------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  title text not null,
  content jsonb not null, -- { explanation, key_concepts[], examples[], review_questions[] }
  created_at timestamptz not null default now()
);

create index if not exists idx_lessons_user on public.lessons(user_id);

-- ----------------------------------------------------------------------------
-- SUMMARIES
-- ----------------------------------------------------------------------------
create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  scope text not null default 'document', -- document | chapter | topic
  content jsonb not null, -- { summary, key_points[], definitions[] }
  created_at timestamptz not null default now()
);

create index if not exists idx_summaries_user on public.summaries(user_id);

-- ----------------------------------------------------------------------------
-- QUIZZES
-- ----------------------------------------------------------------------------
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  title text not null,
  difficulty text not null default 'medium', -- easy | medium | hard
  question_count integer not null default 5,
  created_at timestamptz not null default now()
);

create index if not exists idx_quizzes_user on public.quizzes(user_id);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_index integer not null,
  question text not null,
  options jsonb not null, -- ["A", "B", "C", "D"]
  correct_option_index integer not null,
  explanation text
);

create index if not exists idx_quiz_questions_quiz on public.quiz_questions(quiz_id);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb, -- [{question_id, selected_index}]
  score integer not null default 0,
  total integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_quiz_attempts_user on public.quiz_attempts(user_id);

-- ----------------------------------------------------------------------------
-- FLASHCARDS
-- ----------------------------------------------------------------------------
create table if not exists public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_flashcard_decks_user on public.flashcard_decks(user_id);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  answer text not null,
  known_streak integer not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_flashcards_deck on public.flashcards(deck_id);
create index if not exists idx_flashcards_user on public.flashcards(user_id);

create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  result text not null, -- known | unknown
  reviewed_at timestamptz not null default now()
);

create index if not exists idx_flashcard_reviews_user on public.flashcard_reviews(user_id);

-- ----------------------------------------------------------------------------
-- STUDY PLANS
-- ----------------------------------------------------------------------------
create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  goal text,
  exam_date date,
  hours_per_week numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_study_plans_user on public.study_plans(user_id);

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  study_plan_id uuid not null references public.study_plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  task_type text not null default 'study', -- study | revision | quiz
  scheduled_date date not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_study_tasks_plan on public.study_tasks(study_plan_id);
create index if not exists idx_study_tasks_user_date on public.study_tasks(user_id, scheduled_date);

-- ----------------------------------------------------------------------------
-- STUDY SESSIONS (for streak / time tracking)
-- ----------------------------------------------------------------------------
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null, -- tutor | quiz | flashcards | lesson
  duration_seconds integer not null default 0,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_study_sessions_user_date on public.study_sessions(user_id, occurred_on);

-- ----------------------------------------------------------------------------
-- PROGRESS (rollup, updated by app logic)
-- ----------------------------------------------------------------------------
create table if not exists public.progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak_days integer not null default 0,
  longest_streak_days integer not null default 0,
  last_active_date date,
  total_study_seconds integer not null default 0,
  total_quizzes_taken integer not null default 0,
  total_flashcards_reviewed integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SYSTEM ERROR LOG (admin visibility)
-- ----------------------------------------------------------------------------
create table if not exists public.system_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  scope text not null, -- e.g. 'ai_tutor', 'document_processing'
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_system_errors_created on public.system_errors(created_at desc);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['profiles','subscriptions','usage','documents','conversations']
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- Auto-create profile + free subscription + progress row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));

  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active');

  insert into public.progress (user_id) values (new.id);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
