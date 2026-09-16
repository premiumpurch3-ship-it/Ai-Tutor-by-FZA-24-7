#!/usr/bin/env node
/**
 * DESTRUCTIVE. Drops every table this project created, then re-runs
 * db:migrate from scratch. Intended for local development resets only —
 * never run this against a production database.
 */
import "./_env.mjs";
import { Client } from "pg";
import readline from "node:readline/promises";

const TABLES = [
  "system_errors", "progress", "study_sessions", "study_tasks", "study_plans",
  "flashcard_reviews", "flashcards", "flashcard_decks", "quiz_attempts",
  "quiz_questions", "quizzes", "summaries", "lessons", "messages",
  "conversations", "document_chunks", "documents", "subjects", "usage",
  "subscriptions", "plans", "profiles", "_migrations",
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL in .env.local.");
    process.exit(1);
  }

  if (!process.argv.includes("--yes")) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question("This will DROP all app tables and data. Type 'reset' to continue: ");
    rl.close();
    if (answer.trim() !== "reset") {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const table of TABLES) {
    await client.query(`drop table if exists public.${table} cascade;`);
    console.log(`dropped ${table}`);
  }
  await client.query("drop function if exists public.handle_new_user() cascade;");
  await client.query("drop function if exists public.is_admin() cascade;");
  await client.query("drop function if exists public.set_updated_at() cascade;");

  await client.end();
  console.log("Reset complete. Run 'npm run db:migrate' to rebuild the schema.");
}

main();
