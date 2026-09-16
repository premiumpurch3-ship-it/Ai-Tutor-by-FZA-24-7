-- ============================================================================
-- ROW LEVEL SECURITY — every user table is locked to auth.uid() = user_id.
-- Admins get read access via a security-definer helper (is_admin()).
-- ============================================================================

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable set search_path = public;

-- ----------------------------------------------------------------------------
-- Enable RLS on every user-owned table
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage enable row level security;
alter table public.subjects enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.lessons enable row level security;
alter table public.summaries enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_tasks enable row level security;
alter table public.study_sessions enable row level security;
alter table public.progress enable row level security;
alter table public.system_errors enable row level security;
alter table public.plans enable row level security;

-- plans: readable by everyone (reference/pricing data), writable by no one via API
drop policy if exists "plans_select_all" on public.plans;
create policy "plans_select_all" on public.plans for select using (true);

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Generic per-table owner policies
-- Pattern: select/insert/update/delete where user_id = auth.uid(), plus admin read.
-- ----------------------------------------------------------------------------
do $$
declare
  tbl text;
  owned_tables text[] := array[
    'subscriptions','usage','subjects','documents','document_chunks',
    'conversations','messages','lessons','summaries','quizzes',
    'quiz_attempts','flashcard_decks','flashcards','flashcard_reviews',
    'study_plans','study_tasks','study_sessions'
  ];
begin
  foreach tbl in array owned_tables loop
    execute format('drop policy if exists "%1$s_select_own_or_admin" on public.%1$s;', tbl);
    execute format($f$create policy "%1$s_select_own_or_admin" on public.%1$s
      for select using (auth.uid() = user_id or public.is_admin());$f$, tbl);

    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s;', tbl);
    execute format($f$create policy "%1$s_insert_own" on public.%1$s
      for insert with check (auth.uid() = user_id);$f$, tbl);

    execute format('drop policy if exists "%1$s_update_own" on public.%1$s;', tbl);
    execute format($f$create policy "%1$s_update_own" on public.%1$s
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);$f$, tbl);

    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s;', tbl);
    execute format($f$create policy "%1$s_delete_own" on public.%1$s
      for delete using (auth.uid() = user_id);$f$, tbl);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- quiz_questions: no direct user_id column — scoped through parent quiz
-- ----------------------------------------------------------------------------
drop policy if exists "quiz_questions_select" on public.quiz_questions;
create policy "quiz_questions_select" on public.quiz_questions
  for select using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and (q.user_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "quiz_questions_insert" on public.quiz_questions;
create policy "quiz_questions_insert" on public.quiz_questions
  for insert with check (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.user_id = auth.uid())
  );

drop policy if exists "quiz_questions_delete" on public.quiz_questions;
create policy "quiz_questions_delete" on public.quiz_questions
  for delete using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- progress: single row per user
-- ----------------------------------------------------------------------------
drop policy if exists "progress_select_own_or_admin" on public.progress;
create policy "progress_select_own_or_admin" on public.progress
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "progress_upsert_own" on public.progress;
create policy "progress_upsert_own" on public.progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- system_errors: admin-only read; server (service role) inserts
-- ----------------------------------------------------------------------------
drop policy if exists "system_errors_select_admin" on public.system_errors;
create policy "system_errors_select_admin" on public.system_errors
  for select using (public.is_admin());

-- Inserts to system_errors happen via the service-role key from server code,
-- which bypasses RLS by design — no insert policy needed for regular users.
