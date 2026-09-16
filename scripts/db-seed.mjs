#!/usr/bin/env node
/**
 * Seeds a small amount of demo data for LOCAL DEVELOPMENT ONLY.
 * Creates a demo user (if it doesn't exist) with a sample subject and
 * a couple of dashboard-visible rows so the app isn't empty on first run.
 * Does NOT create fake AI content — the demo user still uploads a real
 * document and generates real lessons/quizzes/flashcards through the app.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only) in .env.local.
 */
import "./_env.mjs";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "demo@aitutor.local";
const DEMO_PASSWORD = "DemoPassword123!";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log(`Creating demo user ${DEMO_EMAIL} ...`);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Demo Student" },
  });

  let userId = created?.user?.id;

  if (createError) {
    if (createError.message.includes("already been registered") || createError.status === 422) {
      console.log("Demo user already exists, fetching id...");
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list.users.find((u) => u.email === DEMO_EMAIL)?.id;
    } else {
      console.error("Failed to create demo user:", createError.message);
      process.exit(1);
    }
  }

  if (!userId) {
    console.error("Could not resolve demo user id.");
    process.exit(1);
  }

  // The handle_new_user() trigger creates profile/subscription/progress rows
  // automatically on signup. We just add a sample subject here.
  const { data: existingSubjects } = await admin.from("subjects").select("id").eq("user_id", userId).limit(1);
  if (!existingSubjects || existingSubjects.length === 0) {
    await admin.from("subjects").insert({ user_id: userId, name: "General Studies", color: "#7c6cf6" });
  }

  console.log("Seed complete.");
  console.log(`  Login with: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("  Upload a document as this user to generate real lessons, quizzes, and flashcards.");
}

main();
