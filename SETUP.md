# AI Tutor — Setup Guide

A RAG-powered AI study platform: upload documents, chat with a tutor grounded
in your material, generate lessons/summaries/quizzes/flashcards, build study
plans, and track real progress. Built with Next.js, Supabase, and Gemini.

This is the **only** setup document in this project — everything you need is
here. Commands are written for **Windows PowerShell** but work the same in
bash/zsh unless noted.

---

## 1. Requirements

- **Node.js 20.x or later** (Node 22 recommended) — https://nodejs.org
- **npm** (ships with Node)
- A **Supabase** account — https://supabase.com (free tier is enough to start)
- A **Google AI Studio** account for a Gemini API key — https://aistudio.google.com
- A **Stripe** account (optional until you want real payments) — https://stripe.com
- A **Vercel** account for deployment — https://vercel.com
- **VS Code** (recommended, not required)

No Docker is required.

---

## 2. Installation

```powershell
cd ai-tutor
npm install
```

---

## 3. Environment variables

```powershell
Copy-Item .env.example .env.local
```

(On macOS/Linux: `cp .env.example .env.local`)

Open `.env.local` in VS Code and fill in the values described in sections 4–6
below. **Never commit `.env.local`** — it's already gitignored.

---

## 4. Create a Supabase project

1. Go to https://supabase.com/dashboard → **New project**.
2. Choose a name, database password (save it — you'll need it for `DATABASE_URL`), and region.
3. Once created, go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, keep secret)
4. Go to **Project Settings → Database → Connection string → URI** and copy it
   into `DATABASE_URL` (replace `[YOUR-PASSWORD]` with your actual password).

---

## 5. Database setup (terminal)

Everything below runs from the project root — no manual SQL editor steps required.

```powershell
npm run db:migrate
```

This creates every table, index, constraint, and Row Level Security policy
(see `supabase/migrations/`), and seeds the `plans` reference table.

Re-running `db:migrate` is safe — already-applied migrations are skipped
(tracked in a `_migrations` table).

To completely wipe and rebuild your **local/dev** database:

```powershell
npm run db:reset
npm run db:migrate
```

`db:reset` is destructive and asks for confirmation — never run it against production.

---

## 6. Supabase Auth setup

Auth works out of the box with email/password once your project exists — no
manual dashboard configuration is required for local development.

For production, go to **Authentication → URL Configuration** in the Supabase
dashboard and set:
- **Site URL**: your production URL (e.g. `https://your-app.vercel.app`)
- **Redirect URLs**: add `https://your-app.vercel.app/auth/callback`

Email confirmations use Supabase's built-in email sending by default (fine for
development; for production volume, configure a custom SMTP provider under
**Project Settings → Auth → SMTP Settings**).

---

## 7. Storage setup (terminal)

```powershell
npm run storage:setup
```

Creates a private `documents` bucket (20MB file limit, PDF/DOCX/TXT only).
File access is enforced by the app's server-side code using the signed-in
user's session — not by public bucket policies.

---

## 8. Seed demo data (terminal, optional)

```powershell
npm run db:seed
```

Creates a demo user (`demo@aitutor.local` / `DemoPassword123!`) with a sample
subject. It does **not** fabricate documents, lessons, quizzes, or analytics —
log in as the demo user and upload a real file to generate real AI content.

---

## 9. Gemini API setup

1. Go to https://aistudio.google.com/apikey and create an API key.
2. Paste it into `.env.local` as `GEMINI_API_KEY`.
3. (Optional) Change `GEMINI_MODEL` if you want a different Gemini model.

---

## 10. Payment (Stripe) setup

Payments are **optional** — the app runs fully without Stripe configured;
billing routes simply return a clear "not configured" message instead of
faking a successful payment.

To enable real payments:

1. Create a Stripe account and, in **Test mode**, go to **Product catalog** →
   create two Products: "Student" and "Pro", each with a recurring monthly Price.
2. Copy the two Price IDs (`price_...`) and run:
   ```powershell
   $env:STRIPE_PRICE_STUDENT="price_xxx"
   $env:STRIPE_PRICE_PRO="price_yyy"
   npm run db:sync-plans
   ```
3. Go to **Developers → API keys**, copy the **Secret key** into
   `STRIPE_SECRET_KEY` in `.env.local`.
4. For local webhook testing, install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
   and run:
   ```powershell
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.
5. In production, create a webhook endpoint in the Stripe dashboard pointing
   to `https://your-app.vercel.app/api/webhooks/stripe`, subscribed to:
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET` in your Vercel environment variables.

Subscription status is **only** ever changed by the webhook handler
(`src/app/api/webhooks/stripe/route.ts`), which verifies Stripe's signature —
the frontend cannot mark a subscription active by itself.

---

## 11. Local development

```powershell
npm run dev
```

Visit http://localhost:3000. Sign up for a new account (or use the seeded
demo account), confirm your email (check the inbox — or Supabase's auth
logs in development), and log in.

---

## 12. Database migration commands

| Command | Purpose |
|---|---|
| `npm run db:migrate` | Apply all pending SQL migrations |
| `npm run db:reset` | **Destructive.** Drop all app tables (local/dev only) |
| `npm run db:sync-plans` | Push Stripe Price IDs into the `plans` table |

---

## 13. Seed commands

| Command | Purpose |
|---|---|
| `npm run db:seed` | Create a demo user + sample subject |
| `npm run admin:promote -- you@example.com` | Promote an existing user to admin |

---

## 14. Build commands

```powershell
npm run build
npm run start
```

---

## 15. Test commands

```powershell
npm run test          # run once
npm run test:watch    # watch mode
npm run typecheck
npm run lint
```

Automated tests cover: usage/entitlement limit logic, server-side quiz
grading (the "never trust the client" scoring path), document chunking, and
input validation schemas. See section 22 for the manual smoke-test checklist
covering auth, RLS, and full user flows that require a live Supabase project.

---

## 16. GitHub setup

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/ai-tutor.git
git push -u origin main
```

---

## 17. Vercel setup

```powershell
npm install -g vercel
vercel login
vercel link
```

Or connect the GitHub repo directly at https://vercel.com/new — either way,
Vercel auto-detects the Next.js project.

---

## 18. Production environment variables

In the Vercel project → **Settings → Environment Variables**, add every
variable from `.env.example` with your production values:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (only needed if you run migration scripts against prod from CI/local)
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` = your production URL

---

## 19. Deployment commands

```powershell
vercel --prod
```

Or push to your connected GitHub branch — Vercel deploys automatically.

Run production database migrations from your local machine (pointed at the
production `DATABASE_URL`) before or right after your first deploy:

```powershell
npm run db:migrate
npm run storage:setup
```

---

## 20. Admin setup

1. Sign up for a normal account through the app.
2. Promote it:
   ```powershell
   npm run admin:promote -- you@example.com
   ```
3. Log in and visit `/admin`. Admin routes are protected server-side (role
   is checked on every admin API route, not just hidden in the UI), and the
   `is_admin()` RLS policy is what actually grants an admin cross-user read
   access at the database level.

---

## 21. Troubleshooting

- **"Missing NEXT_PUBLIC_SUPABASE_URL..."** — `.env.local` wasn't created or
  the dev server needs a restart after editing it.
- **Signup succeeds but login fails** — check that email confirmation isn't
  blocking you; in development, find the confirmation link in Supabase's
  **Authentication → Users** logs, or disable "Confirm email" under
  **Authentication → Providers → Email** for faster local testing.
- **Document stuck in "processing" / shows "error"** — open the document
  detail page for the error message; usually an unreadable/scanned PDF with
  no extractable text, or `GEMINI_API_KEY` missing.
- **"Payments are not configured yet"** — expected until you complete section 10.
- **RLS "permission denied" errors** — make sure `npm run db:migrate` ran
  successfully including `0002_rls.sql`; check the Supabase SQL editor logs.
- **Stripe webhook 400s locally** — make sure `stripe listen` is running and
  `STRIPE_WEBHOOK_SECRET` matches its printed value exactly.

---

## 22. Production checklist / smoke test

Run through this manually against a staging or production deployment before
calling it launch-ready:

- [ ] Sign up, confirm email, log in, log out, reset password
- [ ] Try accessing `/dashboard` while logged out → redirected to `/login`
- [ ] Upload a PDF, a DOCX, and a TXT file → all reach `status: ready`
- [ ] Upload an unsupported file type → clean validation error, not a crash
- [ ] Ask the AI Tutor a question answerable from your material → grounded answer
- [ ] Ask the AI Tutor something **not** in your material → it says so honestly
- [ ] Generate a lesson, a summary, a quiz, and a flashcard deck
- [ ] Take a quiz, submit, confirm the score matches your actual answers
- [ ] Try to exceed your plan's AI message limit → clean 403, not a crash
- [ ] Review a flashcard deck (flip, know/unknown) → progress updates
- [ ] Create a study plan → tasks appear grouped by date; toggle one complete
- [ ] Check `/progress` → numbers match what you actually did (no placeholders)
- [ ] As a second test account, confirm you **cannot** see the first
      account's documents/quizzes/conversations (RLS check)
- [ ] Promote a user to admin, confirm `/admin` shows real counts and that a
      non-admin gets redirected away from `/admin`
- [ ] Complete a Stripe test-mode checkout, confirm the webhook flips your
      plan to `active` (not the frontend)
- [ ] `npm run build` completes with no errors

---

## Architecture notes & known limitations

- **Retrieval is lexical, not vector-based.** The AI Tutor's RAG layer uses
  Postgres full-text search (`tsvector`/`websearch_to_tsquery`) over chunked
  document text rather than embeddings + a vector index. This avoids
  requiring the `pgvector` extension or an embeddings API budget, and works
  well for keyword-rich study material, but is less precise than semantic
  search for paraphrased questions. To upgrade: add the `pgvector` extension,
  an `embedding vector(768)` column to `document_chunks`, populate it via a
  Gemini embeddings call at upload time, and swap the query in
  `src/lib/ai/rag.ts` for a cosine-similarity search.
- **Document processing runs inline** on upload (extract → chunk → store)
  rather than via a background queue. This is simple and reliable for
  typical study documents but means very large files hold the request open
  longer. For high volume, move this into a queue (e.g. Vercel Queues,
  Inngest, or a Supabase Edge Function trigered by a Storage webhook).
- **Mock tests are the quiz-taking flow with an optional timer**, rather than
  a fully separate subsystem — this keeps scoring logic in one, well-tested
  place (`src/lib/quiz/grade.ts`) instead of duplicating it.
- **Audio/TTS is architected for but not wired up.** The `audio_enabled` flag
  already exists per-plan in the `plans` table; to add it, call a
  text-to-speech API (e.g. Gemini's TTS or another provider) from a new
  route gated the same way as `/api/tutor/chat`, and never expose that
  provider's API key to the client.
- **Revenue reporting** is intentionally left to the Stripe Dashboard rather
  than estimated from local subscription rows, to avoid ever showing a
  fabricated number in the admin panel.
