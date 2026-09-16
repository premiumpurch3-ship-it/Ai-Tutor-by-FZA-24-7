#!/usr/bin/env node
/**
 * Usage: npm run admin:promote -- you@example.com
 * Promotes an existing user (must have already signed up) to role='admin'.
 */
import "./_env.mjs";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run admin:promote -- you@example.com");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await admin.from("profiles").update({ role: "admin" }).eq("email", email).select().single();

  if (error || !data) {
    console.error(`Could not find/update a profile for ${email}. Make sure they've signed up first.`);
    process.exit(1);
  }

  console.log(`${email} is now an admin.`);
}

main();
