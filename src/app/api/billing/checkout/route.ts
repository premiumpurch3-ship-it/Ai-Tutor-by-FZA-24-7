import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { z } from "zod";

const bodySchema = z.object({ planId: z.enum(["student", "pro"]) });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to .env.local (see SETUP.md)." },
      { status: 503 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });

  const { data: plan } = await supabase.from("plans").select("*").eq("id", parsed.data.planId).single();
  if (!plan?.stripe_price_id) {
    return NextResponse.json(
      { error: `No Stripe price configured for the ${parsed.data.planId} plan. Run 'npm run db:sync-plans' after creating Prices in Stripe.` },
      { status: 503 }
    );
  }

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single();
  const { data: subscription } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).single();

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: subscription?.stripe_customer_id ?? undefined,
    customer_email: subscription?.stripe_customer_id ? undefined : profile?.email,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: `${appUrl}/billing?checkout=success`,
    cancel_url: `${appUrl}/billing?checkout=canceled`,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan_id: plan.id },
    subscription_data: { metadata: { user_id: user.id, plan_id: plan.id } },
  });

  return NextResponse.json({ url: session.url });
}
