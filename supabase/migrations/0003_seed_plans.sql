-- ============================================================================
-- Seed the plans reference table. Safe to re-run (upsert on id).
-- ============================================================================
insert into public.plans (id, name, price_monthly_cents, stripe_price_id, ai_messages_per_month, documents_limit, quiz_generations_per_month, flashcard_generations_per_month, audio_enabled, advanced_analytics)
values
  ('free',    'Free',    0,    null, 30,   3,  5,  5,  false, false),
  ('student', 'Student', 999,  null, 300,  20, 40, 40, true,  false),
  ('pro',     'Pro',     1999, null, 1000, 100,150,150, true,  true)
on conflict (id) do update set
  name = excluded.name,
  price_monthly_cents = excluded.price_monthly_cents,
  ai_messages_per_month = excluded.ai_messages_per_month,
  documents_limit = excluded.documents_limit,
  quiz_generations_per_month = excluded.quiz_generations_per_month,
  flashcard_generations_per_month = excluded.flashcard_generations_per_month,
  audio_enabled = excluded.audio_enabled,
  advanced_analytics = excluded.advanced_analytics;

-- Note: set real stripe_price_id values with `npm run db:sync-plans` after
-- creating Prices in your Stripe dashboard (see SETUP.md, section 10).
