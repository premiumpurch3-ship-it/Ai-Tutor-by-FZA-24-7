#!/usr/bin/env node
/**
 * After creating Products + recurring Prices in the Stripe Dashboard for
 * the "student" and "pro" plans, set the resulting Price IDs here (or via
 * env vars) and run this script to store them in the plans table so
 * /api/billing/checkout can use them.
 *
 * Usage:
 *   STRIPE_PRICE_STUDENT=price_xxx STRIPE_PRICE_PRO=price_yyy npm run db:sync-plans
 */
import "./_env.mjs";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }

  const studentPriceId = process.env.STRIPE_PRICE_STUDENT;
  const proPriceId = process.env.STRIPE_PRICE_PRO;

  if (!studentPriceId && !proPriceId) {
    console.error("Set STRIPE_PRICE_STUDENT and/or STRIPE_PRICE_PRO before running this script.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  if (studentPriceId) {
    await admin.from("plans").update({ stripe_price_id: studentPriceId }).eq("id", "student");
    console.log(`student plan -> ${studentPriceId}`);
  }
  if (proPriceId) {
    await admin.from("plans").update({ stripe_price_id: proPriceId }).eq("id", "pro");
    console.log(`pro plan -> ${proPriceId}`);
  }

  console.log("Done.");
}

main();
